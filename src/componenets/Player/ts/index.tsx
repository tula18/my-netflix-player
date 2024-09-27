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

  const timeUpdate = (e: SyntheticEvent<HTMLVideoElement, Event>) => {
    const currentSeekTime = Math.floor(e.currentTarget.currentTime);

    if (currentSeekTime % 5 === 0 && !frameCache.current.has(currentSeekTime)) {
        captureFrameAtTime(currentSeekTime);
      }

    setShowInfo(false);
    setEnd(false);
    if (playing) {
      setPlaying(true);
    }

    if (waitingBuffer) {
      setWaitingBuffer(false);
    }

    if (timerBuffer.current) {
      clearTimeout(timerBuffer.current);
    }

    timerBuffer.current = setTimeout(() => setWaitingBuffer(true), 1000);

    if (onTimeUpdate) {
      onTimeUpdate(e);
    }

    let choseBuffer = 0;

    const target = e.target as HTMLVideoElement;

    const lengthBuffer = target.buffered.length;
    let start = 0;
    let endBuffer = 0;
    const currentTime = target.currentTime;

    for (let i = 1; i <= lengthBuffer; i++) {
      const startCheck = target.buffered.start(i - 1);
      const endCheck = target.buffered.end(i - 1);

      if (endCheck > currentTime && currentTime > startCheck) {
        choseBuffer = i;

        if (endCheck > endBuffer) {
          endBuffer = endCheck;
        }

        if (startCheck < start) {
          start = startCheck;
        }
      }
    }

    setProgress(target.currentTime);
  };

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

  const handleProgressBarHover = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!duration) return;
  
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalWidth = rect.width;
    const percent = x / totalWidth;
    const time = duration * percent;

    const roundedTime = Math.floor(time);

    const cachedFrame = frameCache.current.get(roundedTime);
    if (cachedFrame) {
      setPreviewImage(cachedFrame);
      setHoverPosition({ x: e.clientX - rect.left, y: rect.top });
    }
  
    setHoverTime(time);
    setHoverPosition({ x: e.clientX - rect.left, y: rect.top });
    captureFrameAtTime(time);
  };

  const captureFrameAtTime = useCallback(
    (time: number) => {
      if (!previewVideoRef.current || !previewCanvasRef.current) return;
  
      previewVideoRef.current.currentTime = time;
      previewVideoRef.current.onseeked = () => {
        const context = previewCanvasRef.current!.getContext('2d');
        if (context) {
          context.drawImage(
            previewVideoRef.current!,
            0,
            0,
            previewCanvasRef.current!.width,
            previewCanvasRef.current!.height
          );
          const dataURL = previewCanvasRef.current!.toDataURL();
          frameCache.current.set(time, dataURL);
          setPreviewImage(dataURL);
        }
      };
    },
    [setPreviewImage]
  );

  useEffect(() => {
    if (videoReady && videoComponent.current) {
      // Capture frames at intervals
      const interval = 10; // seconds
      for (let time = 0; time < duration; time += interval) {
        captureFrameAtTime(time);
      }
    }
  }, [videoReady, duration]);

  useEffect(() => {
    if (showReproductionList) {
      scrollToSelected();
    }
  }, [showReproductionList]);

  useEffect(() => {
    if (src && videoComponent.current) {
      videoComponent.current.currentTime = startPosition;
      setProgress(0);
      setDuration(0);
      setVideoReady(false);
      setError(false);
      setShowReproductionList(false);
      setShowDataNext(false);
      setPlaying(autoPlay);
    }
  }, [src]);

  useEffect(() => {
    document.addEventListener('keydown', getKeyboardInteraction, false);
    playerElement.current &&
      playerElement.current.addEventListener('fullscreenchange', setStateFullScreen, false);
  }, []);

  useEffect(() => {
    setStateFullScreen();
  }, [document.fullscreenElement]);

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
        width={160} // Adjust the size as needed
        height={90}
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

        {hoverPosition && (
        <PreviewImage
            style={{
            left: `${hoverPosition.x - 80}px`,
            bottom: '100px',
            }}
        >
            {previewImage ? (
            <img src={previewImage} alt="Preview" />
            ) : (
            <div className="loading-spinner" /> // Implement a spinner or placeholder
            )}
        </PreviewImage>
        )}

        {showControlVolume !== true && showQuality !== true && !showDataNext && !showReproductionList && (
          <div className="line-reproduction" onMouseLeave={() => setPreviewImage(null)}>
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
                setPreviewImage(null);
              }}
              title=""
            />
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
