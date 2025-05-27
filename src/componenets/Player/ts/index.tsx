import React, { useEffect, useState, useRef, SyntheticEvent, useCallback } from 'react';
import i18n from 'i18next';
import { useTranslation, initReactI18next } from 'react-i18next';
import {
  FaUndoAlt,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeDown,
  FaVolumeOff,
  FaVolumeMute,
  FaArrowLeft,
  FaExpand,
  FaStepForward,
  FaCog,
  FaClone,
  FaCompress,
  FaRedoAlt,
} from 'react-icons/fa';
import { FiCheck, FiX } from 'react-icons/fi';
import {
  Loading,
  StandByInfo,
  VideoPreLoading,
  Container,
  Controls,
  VolumeControl,
  ItemPlaybackRate,
  IconPlayBackRate,
  ItemNext,
  ItemPlaylist,
  ItemListQuality,
  PreviewImage,
  ProgressBarContainer,
} from './styles.ts';
import translations from './i18n/index.ts';

i18n.use(initReactI18next).init({
  resources: translations,
  lng: 'en',
  fallbackLng: 'en',

  interpolation: {
    escapeValue: false,
  },
});

export enum LanguagesPlayer {
  en = 'en',
  pt = 'pt',
}

export interface IDataNext {
  title: string;
  description?: string;
}

export interface IQualities {
  prefix: string;
  name: string;
  playing: boolean;
  id: string | number;
}

export interface IItemReproduction {
  percent?: number;
  id: number | string;
  playing: boolean;
  name: string;
}

export interface IProps {
  title?: string | boolean;
  subTitle?: string | boolean;
  titleMedia?: string | boolean;
  extraInfoMedia?: string | boolean;
  playerLanguage?: LanguagesPlayer;
  fullPlayer?: boolean;
  backButton?: () => void;
  src: string;
  autoPlay?: boolean;
  onCanPlay?: () => void;
  onTimeUpdate?: (e: SyntheticEvent<HTMLVideoElement, Event>) => void;
  onEnded?: () => void;
  onErrorVideo?: () => void;
  onNextClick?: () => void;
  onClickItemListReproduction?: (id: string | number, playing: boolean) => void;
  onCrossClick?: () => void;
  primaryColor?: string;
  secondaryColor?: string;
  startPosition?: number;
  playbackRateEnable?: boolean;
  fontFamily?: string;
  playbackRateStart?: number;
  playbackRateOptions?: string[];
  autoControlCloseEnabled?: boolean;
  overlayEnabled?: boolean;
  dataNext?: IDataNext;
  reproductionList?: IItemReproduction[];
  qualities?: IQualities[];
  onChangeQuality?: (quality: string | number) => void;
}

export default function ReactNetflixPlayer({
  title = false,
  subTitle = false,
  titleMedia = false,
  extraInfoMedia = false,
  playerLanguage = LanguagesPlayer.en,

  fullPlayer = true,
  backButton = undefined,

  src,
  autoPlay = false,

  onCanPlay = undefined,
  onTimeUpdate = undefined,
  onEnded = undefined,
  onErrorVideo = undefined,
  onNextClick = undefined,
  onClickItemListReproduction = undefined,
  onCrossClick = () => {},
  startPosition = 0,

  dataNext = {} as IDataNext,
  reproductionList = [],
  qualities = [],
  onChangeQuality = [] as any,
  playbackRateEnable = true,
  overlayEnabled = true,
  autoControlCloseEnabled = true,

  // Styles
  primaryColor = '#03dffc',
  secondaryColor = '#ffffff',
  fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",

  playbackRateOptions = ['0.25', '0.5', '0.75', 'Normal', '1.25', '1.5', '2'],
  playbackRateStart = 1,
}: IProps) {
  // References
  const videoComponent = useRef<null | HTMLVideoElement>(null);
  const timerRef = useRef<null | NodeJS.Timeout>(null);
  const timerBuffer = useRef<null | NodeJS.Timeout>(null);
  const playerElement = useRef<null | HTMLDivElement>(null);
  const playlistRef = useRef<null | HTMLDivElement>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCache = useRef<Map<number, string>>(new Map());

  // States
  const [videoReady, setVideoReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [end, setEnd] = useState(false);
  const [controlBackEnd, setControlBackEnd] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const [waitingBuffer, setWaitingBuffer] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<string | number>(playbackRateStart);
  const [started, setStarted] = useState(false);

  const [showControlVolume, setShowControlVolume] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showDataNext, setShowDataNext] = useState(false);
  const [showPlaybackRate, setShowPlaybackRate] = useState(false);
  const [showReproductionList, setShowReproductionList] = useState(false);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  const { t } = useTranslation();

  const secondsToHms = (d: number) => {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    let s = Math.floor((d % 3600) % 60);
    let seconds = s.toString();

    if (s < 10) {
      seconds = `0${s}`;
    }

    if (h) {
      return `${h}:${m}:${seconds}`;
    }

    return `${m}:${seconds}`;
  };

  // Add this state with your other states
  const [bufferedProgress, setBufferedProgress] = useState(0);

  // Ultra-optimized timeUpdate function for maximum performance
  const timeUpdateRef = useRef<number>(0);
  const bufferedUpdateRef = useRef<number>(0);
  const lastProgressState = useRef<{playing: boolean, buffered: number, progress: number}>({playing: false, buffered: 0, progress: 0});
  
  const timeUpdate = useCallback((e: SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = e.target as HTMLVideoElement;
    const currentTime = target.currentTime;
    const duration = target.duration;

    // More aggressive throttling - update only 3 times per second for better performance
    const now = Date.now();
    if (now - timeUpdateRef.current < 333) return;
    timeUpdateRef.current = now;

    // Smart state batching - only update when significant changes occur
    const progressChanged = Math.abs(currentTime - lastProgressState.current.progress) > 1;
    
    if (progressChanged) {
      lastProgressState.current.progress = currentTime;
      setProgress(currentTime);
    }

    // Update buffered progress much less frequently (every 10 seconds)
    if (now - bufferedUpdateRef.current > 10000) {
      bufferedUpdateRef.current = now;
      
      // Calculate buffered progress only when needed
      let bufferedEnd = 0;
      const lengthBuffer = target.buffered.length;

      for (let i = 0; i < lengthBuffer; i++) {
        const startCheck = target.buffered.start(i);
        const endCheck = target.buffered.end(i);

        // Find the buffered range that contains the current time
        if (currentTime >= startCheck && currentTime <= endCheck) {
          bufferedEnd = endCheck;
          break;
        }
        // Also check for buffered ranges ahead of current time
        if (startCheck > currentTime) {
          bufferedEnd = Math.max(bufferedEnd, endCheck);
          break;
        }
      }

      // Only update buffered state if significantly different
      const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
      if (Math.abs(bufferedPercent - lastProgressState.current.buffered) > 5) {
        lastProgressState.current.buffered = bufferedPercent;
        setBufferedProgress(bufferedPercent);
      }
    }

    // Clear buffer waiting state immediately if we get progress
    if (waitingBuffer) {
      setWaitingBuffer(false);
    }

    // Reset buffer timeout less aggressively
    if (timerBuffer.current) {
      clearTimeout(timerBuffer.current);
    }
    timerBuffer.current = setTimeout(() => setWaitingBuffer(true), 8000);

    // Call external onTimeUpdate much less frequently (every 2 seconds)
    if (onTimeUpdate && now - timeUpdateRef.current > 2000) {
      onTimeUpdate(e);
    }

    // Reset overlay states very infrequently
    if (Math.floor(currentTime) % 15 === 0) {
      setShowInfo(false);
      setEnd(false);
    }
  }, [waitingBuffer, onTimeUpdate]);

  const goToPosition = (position: number) => {
    if (videoComponent.current) {
      videoComponent.current.currentTime = position;
      setProgress(position);
    }
  };

  const play = () => {
    if (videoComponent.current) {
      setPlaying(!playing);

      if (videoComponent.current.paused) {
        videoComponent.current.play();
        return;
      }

      videoComponent.current.pause();
    }
  };

  const onEndedFunction = () => {
    if (videoComponent.current) {
      if (+startPosition === +videoComponent.current.duration && !controlBackEnd) {
        setControlBackEnd(true);
        videoComponent.current.currentTime = videoComponent.current.duration - 30;
        if (autoPlay) {
          setPlaying(true);
          videoComponent.current.play();
        } else {
          setPlaying(false);
        }
      } else {
        setEnd(true);
        setPlaying(false);

        if (onEnded) {
          onEnded();
        }
      }
    }
  };

  const nextSeconds = (seconds: number) => {
    if (videoComponent.current) {
      const current = videoComponent.current.currentTime;
      const total = videoComponent.current.duration;

      if (current + seconds >= total - 2) {
        videoComponent.current.currentTime = videoComponent.current.duration - 1;
        setProgress(videoComponent.current.duration - 1);
        return;
      }

      videoComponent.current.currentTime += seconds;
      setProgress(videoComponent.current.currentTime + seconds);
    }
  };

  const previousSeconds = (seconds: number) => {
    if (videoComponent.current) {
      const current = videoComponent.current.currentTime;

      if (current - seconds <= 0) {
        videoComponent.current.currentTime = 0;
        setProgress(0);
        return;
      }

      videoComponent.current.currentTime -= seconds;
      setProgress(videoComponent.current.currentTime - seconds);
    }
  };

  const startVideo = () => {
    if (videoComponent.current) {
      try {
        setDuration(videoComponent.current.duration);
        setVideoReady(true);

        if (!started) {
          setStarted(true);
          setPlaying(false);

          // Ensure video starts at the correct position
          if (startPosition > 0) {
            videoComponent.current.currentTime = startPosition;
            setProgress(startPosition);
          }

          if (autoPlay) {
            videoComponent.current.play();
            setPlaying(!videoComponent.current.paused);
          }
        }

        if (onCanPlay) {
          onCanPlay();
        }
      } catch (err) {
        setPlaying(false);
      }
    }
  };

  const errorVideo = () => {
    if (onErrorVideo) {
      onErrorVideo();
    }
    setError(t('playError', { lng: playerLanguage }));
  };

  const setMutedAction = (value: boolean) => {
    if (videoComponent.current) {
      setMuted(value);
      setShowControlVolume(false);
      videoComponent.current.muted = value;
    }
  };

  const setVolumeAction = (value: number) => {
    if (videoComponent.current) {
      setVolume(value);
      videoComponent.current.volume = value / 100;
    }
  };

  const exitFullScreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }

      setFullScreen(false);
    }
  };

  const enterFullScreen = () => {
    if (playerElement.current) {
      setShowInfo(true);
      if (playerElement.current.requestFullscreen) {
        playerElement.current.requestFullscreen();
        setFullScreen(true);
      }
    }
  };

  const chooseFullScreen = () => {
    if (playerElement.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }

      setShowInfo(true);

      if (playerElement.current.requestFullscreen) {
        playerElement.current.requestFullscreen();
      }
      setFullScreen(true);
    }
  };

  const setStateFullScreen = () => {
    if (!document.fullscreenElement) {
      setFullScreen(false);
      return;
    }

    setFullScreen(true);
  };

  const controlScreenTimeOut = () => {
    if (!autoControlCloseEnabled) {
      setShowInfo(true);
      return;
    }

    setShowControls(false);
    if (!playing) {
      setShowInfo(true);
    }
  };

  const hoverScreen = () => {
    setShowControls(true);
    setShowInfo(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(controlScreenTimeOut, 3000);
  };

  const getKeyboardInteraction = (e: KeyboardEvent) => {
    if (e.keyCode === 32 && videoComponent.current) {
      if (videoComponent.current.paused) {
        videoComponent.current.play();
        setPlaying(true);
        hoverScreen();
      } else {
        videoComponent.current.pause();
        setPlaying(false);
        hoverScreen();
      }
    }
  };

  const scrollToSelected = () => {
    const element = playlistRef.current;
    if (element) {
      const selected = element.getElementsByClassName('selected')[0] as HTMLElement;
      const position = selected.offsetTop;
      const height = selected.offsetHeight;
      element.scrollTop = position - height * 2;
    }
  };

  const onChangePlayBackRate = (value: string | number) => {
    if (videoComponent.current) {
      const speed = value === 'Normal' ? 1 : +value;
      videoComponent.current.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

  const [isCapturing, setIsCapturing] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Highly optimized hover handling with reduced responsiveness for performance
  const handleProgressBarHover = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (!duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalWidth = rect.width;
    const percent = Math.max(0, Math.min(1, x / totalWidth));
    const time = duration * percent;

    // Throttle hover updates for better performance
    const now = Date.now();
    if (now - (handleProgressBarHover as any).lastUpdate < 100) return;
    (handleProgressBarHover as any).lastUpdate = now;

    // Update hover states
    setHoverTime(time);
    setHoverPosition({ x: e.clientX, y: rect.top });

    // Handle preview capture if enabled - with more aggressive throttling
    const roundedTime = Math.floor(time);

    // Check cache first - instant if available
    const cachedFrame = frameCache.current.get(roundedTime);
    if (cachedFrame) {
      setPreviewImage(cachedFrame);
      setLoadingPreview(false);
      return;
    }

    // Clear previous timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set loading state and debounce frame capture
    setPreviewImage(null);
    setLoadingPreview(true);

    // Increased debounce for better performance (800ms)
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isCapturing) {
        captureFrameAtTime(time);
      }
    }, 800);
  }, [duration, isCapturing]);

  // Ultra-optimized frame capture with maximum performance focus
  const captureFrameAtTime = useCallback(
    (time: number) => {
      // Early return if already capturing
      if (!previewVideoRef.current || !previewCanvasRef.current || isCapturing) return;

      // Round to nearest 5 seconds for better cache efficiency
      const roundedTime = Math.floor(time / 5) * 5;
      
      // Check cache first
      const cachedFrame = frameCache.current.get(roundedTime);
      if (cachedFrame && hoverTime !== null) {
        setPreviewImage(cachedFrame);
        setLoadingPreview(false);
        return;
      }

      // Only proceed if we're still hovering and not too far from requested time
      if (hoverTime === null || Math.abs((hoverTime || 0) - roundedTime) > 8) return;

      const video = previewVideoRef.current;
      const canvas = previewCanvasRef.current;
      
      setIsCapturing(true);
      
      // Remove any existing event listener to prevent memory leaks
      video.removeEventListener('seeked', video.onseeked as any);
      
      // Much shorter timeout for minimal UI blocking (300ms)
      const captureTimeout = setTimeout(() => {
        setIsCapturing(false);
        setLoadingPreview(false);
        video.removeEventListener('seeked', video.onseeked as any);
      }, 300);
      
      const handleSeeked = () => {
        clearTimeout(captureTimeout);
        
        // More lenient timing check for better performance
        if (hoverTime === null || Math.abs((hoverTime || 0) - roundedTime) > 8) {
          setIsCapturing(false);
          setLoadingPreview(false);
          return;
        }
        
        const context = canvas.getContext('2d', {
          alpha: false, // Disable alpha channel for better performance
          willReadFrequently: false // We don't read pixels frequently
        });
        
        if (context) {
          try {
            // Use smaller canvas size for better performance (reduced from 160x90)
            context.drawImage(video, 0, 0, 120, 68);
            // Use extremely low quality for maximum performance
            const dataURL = canvas.toDataURL('image/jpeg', 0.1);
            frameCache.current.set(roundedTime, dataURL);
            
            // More lenient timing check for preview setting
            if (Math.abs((hoverTime || 0) - roundedTime) < 8) {
              setPreviewImage(dataURL);
            }
          } catch (error) {
            console.warn('Failed to capture frame:', error);
          }
        }
        
        setIsCapturing(false);
        setLoadingPreview(false);
        video.removeEventListener('seeked', handleSeeked);
      };

      video.addEventListener('seeked', handleSeeked, { once: true });
      
      // Use less frequent seeking for performance
      video.currentTime = time;
    },
    [hoverTime, isCapturing]
  );

  useEffect(() => {
    if (videoReady && videoComponent.current) {
      // Don't pre-load frames if preview is disabled
      if (!videoComponent.current) return;
      
      // Remove automatic frame pre-loading completely for better performance
      // Only capture frames on-demand when hovering
    }
  }, [videoReady, duration]);

  useEffect(() => {
    if (showReproductionList) {
      scrollToSelected();
    }
  }, [showReproductionList]);

  useEffect(() => {
    if (src && videoComponent.current) {
      // Clear the cache when video source changes
      frameCache.current.clear();
      
      // Set the video's initial position first
      videoComponent.current.currentTime = startPosition;
      
      // Set progress to match the startPosition (not always 0)
      setProgress(startPosition);
      setDuration(0);
      setVideoReady(false);
      setError(false);
      setShowReproductionList(false);
      setShowDataNext(false);
      setPlaying(autoPlay);
      setBufferedProgress(0);
      
      // Clear preview states
      setHoverTime(null);
      setPreviewImage(null);
      setHoverPosition(null);
    }
  }, [src, startPosition]); // Add startPosition as dependency

  useEffect(() => {
    document.addEventListener('keydown', getKeyboardInteraction, false);
    playerElement.current &&
      playerElement.current.addEventListener('fullscreenchange', setStateFullScreen, false);
  }, []);

  useEffect(() => {
    setStateFullScreen();
  }, [document.fullscreenElement]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger play/pause if we're not clicking on controls
    const target = e.target as HTMLElement;

    console.log(target);
    
    
    // Check if the click is on the video area (not on controls)
    if (target.tagName === 'VIDEO' || 
        target === playerElement.current ||
        (!target.closest('.controls') && 
         !target.closest('line-reproduction') && 
         !target.closest('button') && 
         !target.closest('[class*="Item"]') && 
         !target.closest('.progress-bar'))) {
      console.log('Container clicked - triggering play/pause');
      e.preventDefault();
      e.stopPropagation();
      play();
    }
  };

  function renderLoading() {
    return (
      <Loading color={primaryColor}>
        <div>
          <div />
          <div />
          <div />
        </div>
      </Loading>
    );
  }

  function renderInfoVideo() {
    return (
      <StandByInfo
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        show={showInfo === true && videoReady === true && playing === false}
      >
        {(title || subTitle) && (
          <section className="center">
            <h3 className="text">{t('youAreWatching', { lng: playerLanguage })}</h3>
            <h1 className="title">{title}</h1>
            <h2 className="sub-title">{subTitle}</h2>
          </section>
        )}
        <footer>{t('paused', { lng: playerLanguage })}</footer>
      </StandByInfo>
    );
  }

  function renderCloseVideo() {
    return (
      <VideoPreLoading
        backgroundColorHoverButtonError="#f78b28"
        colorHoverButtonError="#ddd"
        colorButtonError="#ddd"
        backgroundColorButtonError="#333"
        colorTitle="#fff"
        colorSubTitle="#fff"
        colorIcon="#fff"
        show={videoReady === false || (videoReady === true && error)}
        showError={!!error}
      >
        {(title || subTitle) && (
          <header>
            <div>
              <h1>{title}</h1>
              <h2>{subTitle}</h2>
            </div>
            <FiX onClick={onCrossClick} />
          </header>
        )}

        <section>
          {error && (
            <div>
              <h1>{error}</h1>
              {qualities.length > 1 && (
                <div>
                  <p>{t('tryAccessingOtherQuality', { lng: playerLanguage })}</p>
                  <div className="links-error">
                    {qualities.map(item => (
                      <div onClick={() => onChangeQuality(item.id)}>
                        {item.prefix && <span>HD</span>}
                        <span>{item.name}</span>
                        {item.playing && <FiX />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </VideoPreLoading>
    );
  }

  return (
    <Container
      onMouseMove={hoverScreen}
      ref={playerElement}
      onDoubleClick={chooseFullScreen}
      onClick={handleContainerClick}
      fullPlayer={fullPlayer}
      hideVideo={!!error}
      fontFamily={fontFamily}
    >
      {(videoReady === false || (waitingBuffer === true && playing === true)) && !error && !end && renderLoading()}

      {!!overlayEnabled && renderInfoVideo()}

      {renderCloseVideo()}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoComponent}
        src={src}
        controls={false}
        onCanPlay={() => startVideo()}
        onTimeUpdate={timeUpdate}
        onError={errorVideo}
        onEnded={onEndedFunction}
        style={{ 
          cursor: 'pointer',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        crossOrigin="anonymous"
      />

        <video
        ref={previewVideoRef}
        src={src}
        style={{ display: 'none' }}
        muted
        preload="auto"
        crossOrigin="anonymous"
        />
        <canvas
        ref={previewCanvasRef}
        width={120} // Reduced from 160 for better performance
        height={68} // Reduced from 90 for better performance
        style={{ display: 'none' }}
        />

      <Controls
        show={showControls === true && videoReady === true && error === false}
        primaryColor={primaryColor}
        progressVideo={(progress * 100) / duration}
      >
        {backButton && (
          <div className="back">
            <div onClick={backButton} style={{ cursor: 'pointer' }}>
              <FaArrowLeft />
              <span>{t('goBack', { lng: playerLanguage })}</span>
            </div>
          </div>
        )}

        {hoverPosition && hoverTime !== null && (
        <PreviewImage
            style={{
            left: `${hoverPosition.x - 60}px`,
            bottom: '110px',
            }}
        >
            {previewImage ? (
            <img src={previewImage} alt="Preview" />
            ) : (
            <div className="loading-fallback">
              {loadingPreview ? (
                <>
                  <div className="loading-spinner">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  <span>Loading...</span>
                </>
              ) : (
                <span>No preview</span>
              )}
            </div>
            )}
            <div className="time-indicator">{secondsToHms(hoverTime)}</div>
        </PreviewImage>
        )}

        {showControlVolume !== true && showQuality !== true && !showDataNext && !showReproductionList && (
          <div className="line-reproduction" onMouseLeave={() => setPreviewImage(null)}>
            <ProgressBarContainer
              primaryColor={primaryColor}
              bufferedProgress={bufferedProgress}
              progressVideo={(progress * 100) / duration}
            >
              {/* Buffered progress bar */}
              <div className="buffered-bar" />
              
              {/* Played progress bar */}
              <div className="played-bar" />
              
              {/* Interactive range input */}
              <input
                type="range"
                value={progress}
                className="progress-bar"
                max={duration}
                onChange={e => goToPosition(+e.target.value)}
                onMouseMove={handleProgressBarHover}
                onMouseEnter={handleProgressBarHover}
                onMouseLeave={() => {
                  setHoverTime(null);
                  setHoverPosition(null);
                  setPreviewImage(null);
                  setLoadingPreview(false);
                }}
                title=""
              />
            </ProgressBarContainer>
            <span>{secondsToHms(duration - progress)}</span>
          </div>
        )}

        {videoReady === true && (
          <div className="controls">
            <div className="start">
              <div className="item-control">
                {!playing && <FaPlay onClick={play} />}
                {playing && <FaPause onClick={play} />}
              </div>

              <div className="item-control">
                <FaUndoAlt onClick={() => previousSeconds(5)} />
              </div>

              <div className="item-control">
                <FaRedoAlt onClick={() => nextSeconds(5)} />
              </div>

              {muted === false && (
                <VolumeControl
                  onMouseLeave={() => setShowControlVolume(false)}
                  className="item-control"
                  primaryColor={primaryColor}
                  percentVolume={volume}
                >
                  {showControlVolume === true && (
                    <div className="volume-control">
                      <div className="box-connector" />
                      <div className="box">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={volume}
                          onChange={e => setVolumeAction(+e.target.value)}
                          title=""
                        />
                      </div>
                    </div>
                  )}

                  {volume >= 60 && (
                    <FaVolumeUp onMouseEnter={() => setShowControlVolume(true)} onClick={() => setMutedAction(true)} />
                  )}

                  {volume < 60 && volume >= 10 && (
                    <FaVolumeDown onMouseEnter={() => setShowControlVolume(true)} onClick={() => setMutedAction(true)} />
                  )}

                  {volume < 10 && volume > 0 && (
                    <FaVolumeOff onMouseEnter={() => setShowControlVolume(true)} onClick={() => setMutedAction(true)} />
                  )}

                  {volume <= 0 && (
                    <FaVolumeMute onMouseEnter={() => setShowControlVolume(true)} onClick={() => setVolumeAction(0)} />
                  )}
                </VolumeControl>
              )}

              {muted === true && (
                <div className="item-control">
                  <FaVolumeMute onClick={() => setMutedAction(false)} />
                </div>
              )}
            </div>

            {/* Center section for titleMedia */}
            <div className="center">
              <div className="item-control info-video">
                <span className="info-first">{titleMedia}</span>
                <span className="info-second">{extraInfoMedia}</span>
              </div>
            </div>

            <div className="end">
              {!!playbackRateEnable && (
                <div className="item-control" onMouseLeave={() => setShowPlaybackRate(false)}>
                  {showPlaybackRate === true && (
                    <ItemPlaybackRate>
                      <div>
                        <div className="title">{t('speeds', { lng: playerLanguage })}</div>
                        {playbackRateOptions.map(item => (
                          <div className="item" onClick={() => onChangePlayBackRate(item)}>
                            {(+item === +playbackRate || (item === 'Normal' && +playbackRate === 1)) && FiCheck({})}
                            <div className="bold">{item === 'Normal' ? item : `${item}x`}</div>
                          </div>
                        ))}
                      </div>
                      <div className="box-connector" />
                    </ItemPlaybackRate>
                  )}

                  <IconPlayBackRate className="playbackRate" onMouseEnter={() => setShowPlaybackRate(true)}>
                    <span>
                      {playbackRate === 'Normal' ? '1' : `${playbackRate}`}
                      <small>x</small>
                    </span>
                  </IconPlayBackRate>
                </div>
              )}

              {onNextClick && (
                <div className="item-control" onMouseLeave={() => setShowDataNext(false)}>
                  {showDataNext === true && dataNext.title && (
                    <ItemNext>
                      <div>
                        <div className="title">{t('nextEpisode', { lng: playerLanguage })}</div>
                        <div className="item" onClick={onNextClick}>
                          <div className="bold">{dataNext.title}</div>
                          {dataNext.description && <div>{dataNext.description}</div>}
                        </div>
                      </div>
                      <div className="box-connector" />
                    </ItemNext>
                  )}

                  <FaStepForward onClick={onNextClick} onMouseEnter={() => setShowDataNext(true)} />
                </div>
              )}

              <div className="item-control" onMouseLeave={() => setShowReproductionList(false)}>
                {showReproductionList && (
                  <ItemPlaylist>
                    <div>
                      <div className="title">{t('playlist', { lng: playerLanguage })}</div>
                      <div ref={playlistRef} className="list-playback scroll-clean-player">
                        {reproductionList.map((item, index) => (
                          <div
                            className={`item-playback ${item.playing && 'selected'}`}
                            onClick={() =>
                              onClickItemListReproduction && onClickItemListReproduction(item.id, item.playing)
                            }
                          >
                            <div className="bold">
                              <span style={{ marginRight: 15 }}>{index + 1}</span>
                              {item.name}
                            </div>

                            {item.percent && <div className="percent" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="box-connector" />
                  </ItemPlaylist>
                )}
                {reproductionList && reproductionList.length > 1 && (
                  <FaClone onMouseEnter={() => setShowReproductionList(true)} />
                )}
              </div>

              {qualities && qualities.length > 1 && (
                <div className="item-control" onMouseLeave={() => setShowQuality(false)}>
                  {showQuality === true && (
                    <ItemListQuality>
                      <div>
                        {qualities &&
                          qualities.map(item => (
                            <div
                              onClick={() => {
                                setShowQuality(false);
                                onChangeQuality(item.id);
                              }}
                            >
                              {item.prefix && <span>HD</span>}

                              <span>{item.name}</span>
                              {item.playing && <FiCheck />}
                            </div>
                          ))}
                      </div>
                      <div className="box-connector" />
                    </ItemListQuality>
                  )}

                  <FaCog onMouseEnter={() => setShowQuality(true)} />
                </div>
              )}

              <div className="item-control">
                {fullScreen === false && <FaExpand onClick={enterFullScreen} />}
                {fullScreen === true && <FaCompress onClick={exitFullScreen} />}
              </div>
            </div>
          </div>
        )}
      </Controls>
    </Container>
  );
}
