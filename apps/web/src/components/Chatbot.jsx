import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'




// ============================================================
// LANGUAGE CONFIGURATION
// ============================================================

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  bn: 'Bengali',
  or: 'Odia',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi'
}


const SPEECH_LANGUAGE_CODES = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  or: 'or-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN'
}




// ============================================================
// FALLBACK RESPONSE
// ============================================================

function getFallbackResponse(language) {
  const fallbacks = {
    en:
      'CropMatrix AI cannot connect right now. Please try again later.',

    hi:
      'CropMatrix AI अभी कनेक्ट नहीं हो पा रहा है। कृपया थोड़ी देर बाद दोबारा प्रयास करें।',

    ta:
      'CropMatrix AI தற்போது இணைக்க முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',

    te:
      'CropMatrix AI ప్రస్తుతం కనెక్ట్ కావడం లేదు. కొంతసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.',

    kn:
      'CropMatrix AI ಪ್ರಸ್ತುತ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',

    ml:
      'CropMatrix AI നിലവിൽ കണക്റ്റ് ചെയ്യാൻ കഴിയുന്നില്ല. കുറച്ച് സമയത്തിന് ശേഷം വീണ്ടും ശ്രമിക്കുക.',

    bn:
      'CropMatrix AI বর্তমানে সংযোগ করতে পারছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।',

    or:
      'CropMatrix AI ବର୍ତ୍ତମାନ ସଂଯୋଗ କରିପାରୁ ନାହିଁ। କିଛି ସମୟ ପରେ ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ।',

    mr:
      'CropMatrix AI सध्या कनेक्ट होऊ शकत नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',

    gu:
      'CropMatrix AI હાલમાં કનેક્ટ થઈ શકતું નથી. કૃપા કરીને થોડા સમય પછી ફરી પ્રયાસ કરો.',

    pa:
      'CropMatrix AI ਇਸ ਵੇਲੇ ਕਨੈਕਟ ਨਹੀਂ ਹੋ ਸਕਦਾ। ਕੁਝ ਸਮੇਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
  }

  return fallbacks[language] || fallbacks.en
}




// ============================================================
// MARKDOWN MESSAGE RENDERER
// ============================================================

function InlineMarkdown({ text }) {
  const parts = String(text).split(/(\*\*.*?\*\*)/g)

  return (
    <>
      {parts.map((part, index) => {
        if (
          part.startsWith('**') &&
          part.endsWith('**') &&
          part.length >= 4
        ) {
          return (
            <strong
              key={index}
              className="font-bold text-on-surface"
            >
              {part.slice(2, -2)}
            </strong>
          )
        }

        return (
          <span key={index}>
            {part}
          </span>
        )
      })}
    </>
  )
}


function MarkdownMessage({ text }) {
  const lines = String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')

  return (
    <div className="space-y-2">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim()

        if (!line) {
          return (
            <div
              key={index}
              className="h-1"
            />
          )
        }

        // Horizontal rule
        if (/^---+$/.test(line)) {
          return (
            <hr
              key={index}
              className="my-2 border-surface-container-high"
            />
          )
        }

        // Headings
        if (line.startsWith('### ')) {
          return (
            <h4
              key={index}
              className="font-headline font-bold text-sm mt-3 text-on-surface"
            >
              <InlineMarkdown text={line.slice(4)} />
            </h4>
          )
        }

        if (line.startsWith('## ')) {
          return (
            <h3
              key={index}
              className="font-headline font-bold text-[15px] mt-3 text-on-surface"
            >
              <InlineMarkdown text={line.slice(3)} />
            </h3>
          )
        }

        if (line.startsWith('# ')) {
          return (
            <h2
              key={index}
              className="font-headline font-extrabold text-base mt-3 text-on-surface"
            >
              <InlineMarkdown text={line.slice(2)} />
            </h2>
          )
        }

        // Bullet points
        if (
          line.startsWith('- ') ||
          line.startsWith('* ')
        ) {
          return (
            <div
              key={index}
              className="flex gap-2 pl-1"
            >
              <span className="text-primary font-bold">
                •
              </span>

              <span className="flex-1">
                <InlineMarkdown text={line.slice(2)} />
              </span>
            </div>
          )
        }

        // Numbered lists
        const numbered = line.match(/^(\d+)\.\s+(.*)$/)

        if (numbered) {
          return (
            <div
              key={index}
              className="flex gap-2 pl-1"
            >
              <span className="text-primary font-bold min-w-[18px]">
                {numbered[1]}.
              </span>

              <span className="flex-1">
                <InlineMarkdown text={numbered[2]} />
              </span>
            </div>
          )
        }

        // Normal paragraph
        return (
          <p
            key={index}
            className="leading-relaxed"
          >
            <InlineMarkdown text={line} />
          </p>
        )
      })}
    </div>
  )
}


// ============================================================
// CROPMATRIX BACKEND AI REQUEST
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000'


async function askGemini(messages, language) {

  const languageName =
    LANGUAGE_NAMES[language] || 'English'

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')

  if (!lastUserMessage) {
    return getFallbackResponse(language)
  }

  try {

    const response = await fetch(
      `${API_BASE_URL}/ai/chat`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          message: lastUserMessage.text,
          language: languageName
        })
      }
    )

    if (!response.ok) {

      const errorText =
        await response.text()

      console.error(
        'CropMatrix Backend Error:',
        response.status,
        errorText
      )

      throw new Error(
        `Backend returned ${response.status}`
      )
    }

    const data =
      await response.json()

    if (
      data.success === true &&
      data.reply
    ) {
      return data.reply
    }

    console.error(
      'CropMatrix AI returned failure:',
      data
    )

    return getFallbackResponse(language)

  } catch (error) {

    console.error(
      'CropMatrix AI connection error:',
      error
    )

    return getFallbackResponse(language)
  }
}


// ============================================================
// CHATBOT
// ============================================================

export default function Chatbot() {

  const {
    language,
    speechCode
  } = useLanguage()


  const [isOpen, setIsOpen] =
    useState(false)

  const [messages, setMessages] =
    useState([])

  const [input, setInput] =
    useState('')

  const [isLoading, setIsLoading] =
    useState(false)

  const [isSpeaking, setIsSpeaking] =
    useState(false)

  const [voiceEnabled, setVoiceEnabled] =
    useState(true)


  const messagesEndRef =
    useRef(null)

  const inputRef =
    useRef(null)


  // ==========================================================
  // SPEECH RECOGNITION
  // ==========================================================

  const {
    isListening,
    isProcessing,
    isSupported,
    toggleListening,
    stopListening
  } = useSpeechRecognition({

    lang: speechCode,

    onResult: (text) => {
      setInput(text)
    }

  })


  // ==========================================================
  // TEXT TO SPEECH
  // ==========================================================

  const stopSpeaking = () => {

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {

      window.speechSynthesis.cancel()

    }

    setIsSpeaking(false)

  }


  const speakText = (text) => {

    if (!voiceEnabled) return

    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {

      console.warn(
        'Speech synthesis is not supported'
      )

      return

    }


    window.speechSynthesis.cancel()


    const cleanText = text

      .replace(/\*\*/g, '')

      .replace(/\*/g, '')

      .replace(/#/g, '')

      .replace(/`/g, '')

      .replace(
        /\[(.*?)\]\(.*?\)/g,
        '$1'
      )


    const utterance =
      new SpeechSynthesisUtterance(
        cleanText
      )


    const targetLanguage =
      SPEECH_LANGUAGE_CODES[language] ||
      'en-IN'


    utterance.lang =
      targetLanguage

    utterance.rate =
      0.9

    utterance.pitch =
      1

    utterance.volume =
      1


    const voices =
      window.speechSynthesis.getVoices()


    const matchingVoice =
      voices.find((voice) => {

        const voiceLanguage =
          voice.lang
            ?.toLowerCase()

        const requestedLanguage =
          targetLanguage
            .split('-')[0]
            .toLowerCase()

        return voiceLanguage
          ?.startsWith(
            requestedLanguage
          )

      })


    if (matchingVoice) {

      utterance.voice =
        matchingVoice

    }


    utterance.onstart = () => {

      setIsSpeaking(true)

    }


    utterance.onend = () => {

      setIsSpeaking(false)

    }


    utterance.onerror = () => {

      setIsSpeaking(false)

    }


    window.speechSynthesis.speak(
      utterance
    )

  }


  // Load voices

  useEffect(() => {

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {

      window.speechSynthesis.getVoices()

    }

  }, [])


  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {

    messagesEndRef.current
      ?.scrollIntoView({
        behavior: 'smooth'
      })

  }, [messages])


  // ==========================================================
  // WELCOME MESSAGE
  // ==========================================================

  useEffect(() => {

    if (
      isOpen &&
      messages.length === 0
    ) {

      const welcomeMessage =
        language === 'hi'

          ? 'नमस्ते! मैं CropMatrix AI Assistant हूँ। मुझसे फसल, मिट्टी, मौसम, बीमारी, खाद, कीट या मंडी भाव के बारे में पूछिए।'

          : "Hello! I'm CropMatrix AI Assistant. Ask me about crops, soil, weather, diseases, fertilizers, pests, market prices or farming."


      setMessages([
        {
          role: 'assistant',
          text: welcomeMessage
        }
      ])

    }

  }, [isOpen])


  // ==========================================================
  // LANGUAGE CHANGE
  // ==========================================================

  useEffect(() => {

    stopSpeaking()

    if (
      messages.length === 1 &&
      messages[0].role ===
        'assistant'
    ) {

      const welcomeMessage =
        language === 'hi'

          ? 'नमस्ते! मैं CropMatrix AI Assistant हूँ। आज मैं आपकी खेती में कैसे मदद कर सकता हूँ?'

          : "Hello! I'm CropMatrix AI Assistant. How can I help with your farm today?"


      setMessages([
        {
          role: 'assistant',
          text: welcomeMessage
        }
      ])

    }

  }, [language])


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const handleSend = async () => {

    const text =
      input.trim()


    if (
      !text ||
      isLoading
    ) {

      return

    }


    if (isListening) {

      stopListening()

    }


    stopSpeaking()


    const userMessage = {

      role: 'user',

      text

    }


    const updatedMessages = [

      ...messages,

      userMessage

    ]


    setMessages(
      updatedMessages
    )

    setInput('')

    setIsLoading(true)


    try {

      const reply =
        await askGemini(
          updatedMessages,
          language
        )


      setMessages(
        (previous) => [

          ...previous,

          {
            role: 'assistant',
            text: reply
          }

        ]
      )


      // 🔊 Speak Gemini reply
      speakText(reply)

    } catch (error) {

      console.error(
        'CropMatrix Assistant Error:',
        error
      )


      const errorMessage =
        getFallbackResponse(
          language
        )


      setMessages(
        (previous) => [

          ...previous,

          {
            role: 'assistant',
            text: errorMessage
          }

        ]
      )

    } finally {

      setIsLoading(false)

    }

  }


  // ==========================================================
  // ENTER KEY
  // ==========================================================

  const handleKeyDown = (event) => {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault()

      handleSend()

    }

  }


  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose = () => {

    stopSpeaking()


    if (isListening) {

      stopListening()

    }


    setIsOpen(false)

  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <>


      {/* =====================================================
          FLOATING BUTTON
      ===================================================== */}

      {!isOpen && (

        <button

          className="
            fixed
            bottom-20
            md:bottom-8
            right-5

            z-[100]

            w-14
            h-14

            rounded-full

            bg-primary
            hover:bg-primary-container

            text-white

            shadow-xl
            shadow-primary/30

            flex
            items-center
            justify-center

            transition-all

            hover:scale-105

            group
          "

          onClick={() =>
            setIsOpen(true)
          }

          title="CropMatrix AI Assistant"

          aria-label="Open CropMatrix AI Assistant"

        >

          <span
            className="
              material-symbols-outlined
              text-2xl
            "
            style={{
              fontVariationSettings:
                "'FILL' 1"
            }}
          >
            smart_toy
          </span>


          <span
            className="
              absolute
              -top-0.5
              -right-0.5

              w-4
              h-4

              bg-green-500

              rounded-full

              border-2
              border-surface
            "
          />


          <div
            className="
              absolute
              right-full
              mr-3

              bg-inverse-surface
              text-inverse-on-surface

              px-3
              py-1.5

              rounded-lg

              text-xs
              font-bold

              whitespace-nowrap

              opacity-0
              group-hover:opacity-100

              transition-opacity

              pointer-events-none
            "
          >
            CropMatrix AI
          </div>

        </button>

      )}


      {/* =====================================================
          CHAT PANEL
      ===================================================== */}

      {isOpen && (

        <div

          className="
            fixed
            bottom-20
            md:bottom-8
            right-5

            z-[100]

            w-[390px]

            max-w-[calc(100vw-2.5rem)]

            bg-white

            rounded-3xl

            shadow-2xl

            overflow-hidden

            flex
            flex-col
          "

          style={{
            maxHeight:
              'min(620px, calc(100vh - 120px))'
          }}

        >


          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              bg-primary

              p-4

              flex
              items-center
              justify-between
            "
          >


            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-10
                  h-10

                  rounded-full

                  bg-white/20

                  flex
                  items-center
                  justify-center
                "
              >

                <span
                  className="
                    material-symbols-outlined
                    text-white
                    text-xl
                  "
                >
                  smart_toy
                </span>

              </div>


              <div>

                <h3
                  className="
                    font-headline
                    font-bold
                    text-white
                    text-sm
                  "
                >
                  CropMatrix AI Assistant
                </h3>


                <p
                  className="
                    font-label

                    text-[10px]

                    text-white/70

                    uppercase

                    tracking-wider
                  "
                >

                  {isListening
                    ? '🎤 LISTENING...'
                    : isSpeaking
                      ? '🔊 SPEAKING...'
                      : isLoading
                        ? '🤖 THINKING...'
                        : 'CROPMATRIX AI • READY'}

                </p>

              </div>

            </div>


            <div
              className="
                flex
                items-center
                gap-1
              "
            >


              {/* Voice Toggle */}

              <button

                onClick={() => {

                  if (voiceEnabled) {

                    stopSpeaking()

                  }

                  setVoiceEnabled(
                    previous =>
                      !previous
                  )

                }}

                title={
                  voiceEnabled
                    ? 'Turn off spoken answers'
                    : 'Turn on spoken answers'
                }

                className="
                  w-8
                  h-8

                  rounded-full

                  bg-white/10
                  hover:bg-white/20

                  flex
                  items-center
                  justify-center
                "
              >

                <span
                  className="
                    material-symbols-outlined
                    text-white
                    text-lg
                  "
                >

                  {voiceEnabled
                    ? 'volume_up'
                    : 'volume_off'}

                </span>

              </button>


              {/* Close */}

              <button

                onClick={
                  handleClose
                }

                className="
                  w-8
                  h-8

                  rounded-full

                  bg-white/10
                  hover:bg-white/20

                  flex
                  items-center
                  justify-center
                "
              >

                <span
                  className="
                    material-symbols-outlined
                    text-white
                    text-lg
                  "
                >
                  close
                </span>

              </button>

            </div>

          </div>


          {/* =================================================
              VOICE STATUS
          ================================================= */}

          {(isListening ||
            isProcessing ||
            isSpeaking) && (

            <div
              className={`
                px-4
                py-3

                flex
                items-center
                justify-center
                gap-2

                text-xs
                font-bold

                ${
                  isListening
                    ? 'bg-red-50 text-red-600'

                    : isSpeaking
                      ? 'bg-emerald-50 text-emerald-700'

                      : 'bg-amber-50 text-amber-700'
                }
              `}
            >

              <span
                className="
                  material-symbols-outlined
                  text-lg
                "
              >

                {isListening
                  ? 'mic'

                  : isSpeaking
                    ? 'volume_up'

                    : 'hourglass_empty'}

              </span>


              {isListening &&
                'Listening...'}

              {isProcessing &&
                'Processing voice...'}

              {isSpeaking &&
                'CropMatrix is speaking...'}

            </div>

          )}


          {/* =================================================
              MESSAGES
          ================================================= */}

          <div
            className="
              flex-1

              overflow-y-auto

              p-4

              space-y-3

              hide-scrollbar

              bg-surface-container-low
            "

            style={{
              minHeight:
                '240px'
            }}
          >


            {messages.map(
              (
                message,
                index
              ) => (

                <div

                  key={index}

                  className={`
                    flex
                    gap-2.5

                    ${
                      message.role ===
                      'user'

                        ? 'flex-row-reverse'

                        : 'flex-row'
                    }
                  `}
                >


                  {message.role ===
                    'assistant' && (

                    <div
                      className="
                        w-7
                        h-7

                        rounded-full

                        bg-primary/10

                        flex
                        items-center
                        justify-center

                        flex-shrink-0

                        mt-1
                      "
                    >

                      <span
                        className="
                          material-symbols-outlined
                          text-primary
                          text-sm
                        "
                      >
                        smart_toy
                      </span>

                    </div>

                  )}


                  <div
                    className={`
                      max-w-[78%]

                      px-4
                      py-2.5

                      text-[13px]

                      leading-relaxed

                      ${
                        message.role ===
                        'user'

                          ? `
                            bg-primary
                            text-white

                            rounded-2xl
                            rounded-tr-md
                          `

                          : `
                            bg-white
                            text-on-surface

                            rounded-2xl
                            rounded-tl-md

                            editorial-shadow
                          `
                      }
                    `}
                  >

                    {message.role === 'assistant' ? (
                      <MarkdownMessage text={message.text} />
                    ) : (
                      message.text
                    )}

                  </div>


                  {/* Replay Assistant Answer */}

                  {message.role ===
                    'assistant' && (

                    <button

                      onClick={() =>
                        speakText(
                          message.text
                        )
                      }

                      title="Listen"

                      className="
                        self-center

                        w-7
                        h-7

                        rounded-full

                        hover:bg-primary/10

                        text-primary/50
                        hover:text-primary

                        flex
                        items-center
                        justify-center
                      "
                    >

                      <span
                        className="
                          material-symbols-outlined
                          text-sm
                        "
                      >
                        volume_up
                      </span>

                    </button>

                  )}

                </div>

              )
            )}


            {/* Thinking Indicator */}

            {isLoading && (

              <div
                className="
                  flex
                  gap-2.5
                "
              >

                <div
                  className="
                    w-7
                    h-7

                    rounded-full

                    bg-primary/10

                    flex
                    items-center
                    justify-center
                  "
                >

                  <span
                    className="
                      material-symbols-outlined
                      text-primary
                      text-sm
                    "
                  >
                    smart_toy
                  </span>

                </div>


                <div
                  className="
                    bg-white

                    px-4
                    py-3

                    rounded-2xl

                    flex
                    gap-1.5
                  "
                >

                  {[0, 1, 2].map(
                    index => (

                      <span

                        key={index}

                        className="
                          w-2
                          h-2

                          bg-primary/30

                          rounded-full

                          animate-bounce
                        "

                        style={{
                          animationDelay:
                            `${index * 150}ms`
                        }}
                      />

                    )
                  )}

                </div>

              </div>

            )}


            <div
              ref={
                messagesEndRef
              }
            />

          </div>


          {/* =================================================
              INPUT
          ================================================= */}

          <div
            className="
              p-3

              bg-white

              border-t
              border-surface-container-high/50
            "
          >

            <div
              className="
                flex
                items-center
                gap-2

                bg-surface-container-low

                rounded-2xl

                px-3
                py-1.5
              "
            >


              {/* Microphone */}

              <button

                className={`
                  w-10
                  h-10

                  rounded-full

                  flex
                  items-center
                  justify-center

                  flex-shrink-0

                  transition-all

                  ${
                    isListening

                      ? `
                        bg-red-500
                        text-white
                        animate-pulse
                      `

                      : isProcessing

                        ? `
                          bg-amber-500
                          text-white
                        `

                        : `
                          bg-primary/10
                          text-primary
                          hover:bg-primary
                          hover:text-white
                        `
                  }
                `}

                onClick={() => {

                  stopSpeaking()

                  toggleListening()

                }}

                disabled={
                  isProcessing ||
                  !isSupported
                }

                title={
                  !isSupported
                    ? 'Voice input is not supported'
                    : 'Speak to CropMatrix'
                }
              >

                <span
                  className="
                    material-symbols-outlined
                    text-xl
                  "
                >

                  {isProcessing
                    ? 'hourglass_empty'

                    : isListening
                      ? 'stop'

                      : 'mic'}

                </span>

              </button>


              {/* Text Input */}

              <input

                ref={inputRef}

                className="
                  flex-1

                  bg-transparent

                  border-none

                  text-sm

                  text-on-surface

                  placeholder:text-on-surface-variant/40

                  py-2

                  focus:ring-0
                  focus:outline-none

                  font-body
                "

                value={
                  input
                }

                onChange={
                  event =>
                    setInput(
                      event.target.value
                    )
                }

                onKeyDown={
                  handleKeyDown
                }

                placeholder={
                  isListening
                    ? 'Listening...'
                    : 'Ask CropMatrix about farming...'
                }

                disabled={
                  isLoading
                }

              />


              {/* Send */}

              <button

                className={`
                  w-9
                  h-9

                  rounded-full

                  flex
                  items-center
                  justify-center

                  transition-all

                  ${
                    input.trim() &&
                    !isLoading

                      ? `
                        bg-primary
                        text-white

                        hover:bg-primary-container
                      `

                      : `
                        text-on-surface-variant/30
                        cursor-not-allowed
                      `
                  }
                `}

                onClick={
                  handleSend
                }

                disabled={
                  !input.trim() ||
                  isLoading
                }
              >

                <span
                  className="
                    material-symbols-outlined
                    text-lg
                  "
                >
                  send
                </span>

              </button>

            </div>


            <div
              className="
                mt-2

                flex
                justify-center

                text-[9px]

                text-on-surface-variant/40

                font-label
              "
            >

              🎤 Speak &nbsp; • &nbsp;
              🤖 CropMatrix AI &nbsp; • &nbsp;
              🔊 Listen

            </div>

          </div>

        </div>

      )}

    </>

  )

}