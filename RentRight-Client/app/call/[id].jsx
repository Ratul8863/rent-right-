import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../_context/AuthContext'
import { useChatSocket } from '../../_context/useChatSocket'
const formatDuration = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

const CallScreen = () => {
  const router = useRouter()
  const {
    id,
    type: rawType,
    incoming,
    callId: queryCallId,
    name: remoteNameParam,
  } = useLocalSearchParams()
  const { accessToken, user } = useAuth()
  
  // Validate id parameter
  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
          <Text className="mt-4 text-base font-semibold text-white">Call not found</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 rounded-2xl bg-cyan-600 px-6 py-2"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const isIncoming = incoming === '1'
  const callType = rawType === 'video' ? 'video' : 'audio'
  const callerName = remoteNameParam ? decodeURIComponent(remoteNameParam) : 'Contact'

  const [rtcModule, setRtcModule] = useState(null)
  const [webrtcError, setWebrtcError] = useState('')
  const rtcRef = useRef(null)

  const getRtc = () => {
    if (rtcRef.current) return rtcRef.current
    try {
      const mod = require('react-native-webrtc')
      rtcRef.current = mod
      setRtcModule(mod)
      return mod
    } catch (err) {
      if (!webrtcError) {
        setWebrtcError('WebRTC native module unavailable. Please use a custom dev client or EAS build.')
      }
      return null
    }
  }

  useEffect(() => {
    try {
      getRtc()
    } catch (err) {
      console.warn('Failed to load WebRTC module:', err)
      setWebrtcError('WebRTC native module unavailable. Please use a custom dev client or EAS build.')
    }
  }, [])

  const [callId, setCallId] = useState(queryCallId || '')
  const [accepted, setAccepted] = useState(!isIncoming)
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'calling')
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [frontCamera, setFrontCamera] = useState(true)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const callIdRef = useRef(queryCallId || '')
  const offerBufferRef = useRef(null)
  const alreadySentOfferRef = useRef(false)

  const {
    connected,
    answerCall,
    endCall,
    sendOffer,
    sendAnswerSDP,
    sendIceCandidate,
  } = useChatSocket(accessToken, {
    onCall: async (type, payload) => {
      if (!payload) return
      if (type === 'call_started' && !callIdRef.current) {
        setCallId(payload.id)
        callIdRef.current = payload.id
        setCallStatus('calling')
        return
      }

      if (payload.callId && payload.callId !== callIdRef.current) {
        return
      }

      switch (type) {
        case 'offer':
          if (!payload.sdp) return
          offerBufferRef.current = payload.sdp
          if (accepted) {
            await handleRemoteOffer(payload.sdp)
          }
          break
        case 'answer':
          if (!payload.sdp) return
          await handleRemoteAnswer(payload.sdp)
          break
        case 'ice_candidate':
          if (!payload.candidate) return
          await handleRemoteCandidate(payload.candidate)
          break
        case 'call_answered':
          if (payload.status === 'connected') {
            setCallStatus('connected')
          }
          break
        case 'call_ended':
          setCallStatus('ended')
          cleanupCall(false)
          setTimeout(() => router.replace('/'), 1200)
          break
        default:
          break
      }
    },
  })

  const cleanupCall = async (shouldSendEnd = true) => {
    if (shouldSendEnd && callIdRef.current) {
      endCall(callIdRef.current)
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    setRemoteStream(null)
    setCallStatus('ended')
  }

  const createPeerConnection = async (stream) => {
    if (pcRef.current) return pcRef.current

    const rtc = getRtc()
    if (!rtc) {
      throw new Error('WebRTC native module unavailable')
    }
    const pc = new rtc.RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && callIdRef.current) {
        sendIceCandidate(callIdRef.current, candidate)
      }
    }

    pc.ontrack = ({ streams }) => {
      if (streams && streams[0]) {
        setRemoteStream(streams[0])
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (!pcRef.current) return
      if (pcRef.current.iceConnectionState === 'connected') {
        setCallStatus('connected')
      }
      if (['disconnected', 'failed', 'closed'].includes(pcRef.current.iceConnectionState)) {
        setCallStatus('ended')
      }
    }

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
    }

    pcRef.current = pc
    return pc
  }

  const getLocalStream = async (videoEnabled) => {
    const rtc = getRtc()
    if (!rtc) {
      throw new Error('WebRTC native module unavailable')
    }
    const media = await rtc.mediaDevices.getUserMedia({
      audio: true,
      video: videoEnabled
        ? { facingMode: frontCamera ? 'user' : 'environment' }
        : false,
    })
    localStreamRef.current = media
    setLocalStream(media)
    return media
  }

  const handleRemoteOffer = async (sdp) => {
    try {
      if (!callIdRef.current) return
      const stream = localStreamRef.current || (await getLocalStream(callType === 'video'))
      const pc = await createPeerConnection(stream)
      const rtc = getRtc()
      if (!rtc) {
        throw new Error('WebRTC native module unavailable')
      }
      await pc.setRemoteDescription(new rtc.RTCSessionDescription(sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendAnswerSDP(callIdRef.current, answer)
      setCallStatus('connecting')
    } catch (err) {
      console.warn('Remote offer failed', err)
      setError('Failed to accept call.')
    }
  }

  const handleRemoteAnswer = async (sdp) => {
    try {
      if (!pcRef.current) return
      const rtc = getRtc()
      if (!rtc) {
        throw new Error('WebRTC native module unavailable')
      }
      await pcRef.current.setRemoteDescription(new rtc.RTCSessionDescription(sdp))
      setCallStatus('connected')
    } catch (err) {
      console.warn('Remote answer failed', err)
      setError('Failed to establish call.')
    }
  }

  const handleRemoteCandidate = async (candidate) => {
    try {
      if (!pcRef.current) return
      const rtc = getRtc()
      if (!rtc) {
        throw new Error('WebRTC native module unavailable')
      }
      await pcRef.current.addIceCandidate(new rtc.RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('Candidate add failed', err)
    }
  }

  const makeOffer = async () => {
    try {
      if (!pcRef.current || !callIdRef.current) return
      const offer = await pcRef.current.createOffer()
      await pcRef.current.setLocalDescription(offer)
      sendOffer(callIdRef.current, offer)
      alreadySentOfferRef.current = true
      setCallStatus('calling')
    } catch (err) {
      console.warn('Offer failed', err)
      setError('Unable to start call.')
    }
  }

  useEffect(() => {
    callIdRef.current = callId
  }, [callId])

  useEffect(() => {
    let active = true

    const init = async () => {
      if (!accepted || webrtcError) return
      try {
        const stream = await getLocalStream(callType === 'video')
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        await createPeerConnection(stream)
      } catch (err) {
        console.warn('Media init failed', err)
        setError('Unable to access microphone or camera.')
      }
    }

    init()

    return () => {
      active = false
    }
  }, [accepted, callType, frontCamera, webrtcError])

  useEffect(() => {
    if (webrtcError) return
    if (accepted && !isIncoming && callId && localStreamRef.current && !alreadySentOfferRef.current) {
      makeOffer()
    }
  }, [accepted, isIncoming, callId, localStream, webrtcError])

  useEffect(() => {
    let interval = null
    if (callStatus === 'connected') {
      interval = setInterval(() => setDuration((current) => current + 1), 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [callStatus])

  useEffect(() => {
    if (!accessToken || !id) {
      router.replace('/')
    }
  }, [accessToken, id, router])

  const handleAccept = async () => {
    if (!callIdRef.current) return
    setAccepted(true)
    setCallStatus('connecting')
    answerCall(callIdRef.current, true)
    if (offerBufferRef.current) {
      await handleRemoteOffer(offerBufferRef.current)
      offerBufferRef.current = null
    }
  }

  const handleDecline = () => {
    if (callIdRef.current) {
      answerCall(callIdRef.current, false)
    }
    cleanupCall(false)
    router.replace('/')
  }

  const handleToggleMute = () => {
    const next = !isMuted
    localStreamRef.current?.getAudioTracks()?.forEach((track) => {
      track.enabled = next === false
    })
    setIsMuted(next)
  }

  const handleToggleCamera = () => {
    const next = !cameraOn
    localStreamRef.current?.getVideoTracks()?.forEach((track) => {
      track.enabled = next
    })
    setCameraOn(next)
  }

  const handleFlipCamera = async () => {
    if (callType !== 'video') return
    const nextFront = !frontCamera
    setFrontCamera(nextFront)
    try {
      const rtc = getRtc()
      if (!rtc) {
        throw new Error('WebRTC native module unavailable')
      }
      const newStream = await rtc.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: nextFront ? 'user' : 'environment' },
      })
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      localStreamRef.current = newStream
      setLocalStream(newStream)
      const videoTrack = newStream.getVideoTracks()[0]
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video')
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack)
      }
    } catch (err) {
      console.warn('Flip camera failed', err)
      setError('Unable to switch camera.')
    }
  }

  const handleEnd = () => {
    cleanupCall(true)
    router.replace('/')
  }

  const statusLabel = useMemo(() => {
    if (callStatus === 'incoming') return `${callerName} is calling...`
    if (callStatus === 'calling') return 'Calling'
    if (callStatus === 'connecting') return 'Connecting'
    if (callStatus === 'connected') return `Connected • ${formatDuration(duration)}`
    if (callStatus === 'ended') return 'Call ended'
    return 'Connecting'
  }, [callStatus, callerName, duration])

  if (webrtcError) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-white text-center">WebRTC not available</Text>
          <Text className="mt-3 text-center text-sm text-slate-300">{webrtcError}</Text>
          <Text className="mt-4 text-center text-sm text-slate-400">Use a custom dev client or EAS build with native modules installed.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-4">
          <TouchableOpacity onPress={() => router.replace('/')} className="rounded-full bg-slate-800 p-2">
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-white">{callType === 'video' ? 'Video Call' : 'Audio Call'}</Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 items-center justify-center px-6">
          {callType === 'video' ? (
            <View className="relative h-full w-full overflow-hidden rounded-3xl bg-slate-900">
              {remoteStream ? (
                rtcModule ? (
                  <rtcModule.RTCView
                    streamURL={remoteStream.toURL()}
                    className="absolute inset-0 h-full w-full"
                    objectFit="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="videocam" size={64} color="#94a3b8" />
                    <Text className="mt-4 text-base font-semibold text-slate-200">Video unavailable</Text>
                  </View>
                )
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="videocam" size={64} color="#94a3b8" />
                  <Text className="mt-4 text-base font-semibold text-slate-200">Waiting for participant</Text>
                </View>
              )}
              {localStream && rtcModule ? (
                <rtcModule.RTCView
                  streamURL={localStream.toURL()}
                  className="absolute right-4 top-4 h-28 w-20 rounded-3xl border border-white/30"
                  objectFit="cover"
                />
              ) : null}
            </View>
          ) : (
            <View className="h-64 w-64 items-center justify-center rounded-[80px] bg-slate-800">
              <Text className="text-6xl font-black text-cyan-400">{callerName?.slice(0, 2)?.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View className="bg-slate-950 px-6 py-4">
          <Text className="text-center text-base font-semibold text-white">{callerName}</Text>
          <Text className="mt-1 text-center text-sm text-slate-400">{statusLabel}</Text>
          {error ? <Text className="mt-3 text-center text-sm text-rose-400">{error}</Text> : null}

          {callStatus === 'incoming' ? (
            <View className="mt-8 flex-row items-center justify-center gap-4">
              <TouchableOpacity
                onPress={handleDecline}
                className="h-16 w-16 items-center justify-center rounded-full bg-rose-500"
              >
                <Ionicons name="close" size={26} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAccept}
                className="h-16 w-16 items-center justify-center rounded-full bg-emerald-500"
              >
                <Ionicons name="checkmark" size={26} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mt-8 space-y-4">
              <View className="flex-row items-center justify-center gap-4">
                <TouchableOpacity
                  onPress={handleToggleMute}
                  className={`h-16 w-16 items-center justify-center rounded-full ${isMuted ? 'bg-slate-700' : 'bg-cyan-600'}`}
                >
                  <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="white" />
                </TouchableOpacity>
                {callType === 'video' ? (
                  <TouchableOpacity
                    onPress={handleToggleCamera}
                    className={`h-16 w-16 items-center justify-center rounded-full ${cameraOn ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <Ionicons name={cameraOn ? 'videocam' : 'videocam-off'} size={24} color="white" />
                  </TouchableOpacity>
                ) : null}
                {callType === 'video' ? (
                  <TouchableOpacity
                    onPress={handleFlipCamera}
                    className="h-16 w-16 items-center justify-center rounded-full bg-slate-700"
                  >
                    <Ionicons name="camera-reverse" size={24} color="white" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleEnd}
                className="mt-4 h-16 items-center justify-center rounded-full bg-rose-600"
              >
                <Text className="text-base font-semibold text-white">End Call</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

export default CallScreen
