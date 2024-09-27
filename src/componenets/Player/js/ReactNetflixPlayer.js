import React, { useEffect, useState, useRef } from 'react';
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
import translations from './translations';
import './ReactNetflixPlayer.css';

i18n.use(initReactI18next).init({
  resources: translations,
  lng: 'pt',
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
});

const LanguagesPlayer = {
  pt: 'pt',
  en: 'en',
  he: 'he',
};

export default function ReactNetflixPlayer(props) {
  const {
    title = false,
    subTitle = false,
    titleMedia = false,
    extraInfoMedia = false,
    playerLanguage = LanguagesPlayer.pt,
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
    dataNext = {},
    reprodutionList = [],
    qualities = [],
    onChangeQuality = () => {},
    playbackRateEnable = true,
    overlayEnabled = true,
    autoControllCloseEnabled = true,
    primaryColor = '#03dffc',
    secundaryColor = '#ffffff',
    fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    playbackRateOptions = ['0.25', '0.5', '0.75', 'Normal', '1.25', '1.5', '2'],
    playbackRateStart = 1,
  } = props;

  const videoComponent = useRef(null);
  const timerRef = useRef(null);
  const timerBuffer = useRef(null);
  const playerElement = useRef(null);
  const listReproduction = useRef(null);

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
  const [playbackRate, setPlaybackRate] = useState(playbackRateStart);
  const [started, setStarted] = useState(false);

  const [showControlVolume, setShowControlVolume] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showDataNext, setShowDataNext] = useState(false);
  const [showPlaybackRate, setShowPlaybackRate] = useState(false);
  const [showReproductionList, setShowReproductionList] = useState(false);

  const { t } = useTranslation();

  const secondsToHms = (d) => {
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

  const timeUpdate = (e) => {
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

    setProgress(e.target.currentTime);
  };

  const goToPosition = (position) => {
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

  const nextSeconds = (seconds) => {
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

  const previousSeconds = (seconds) => {
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

  const erroVideo = () => {
    if (onErrorVideo) {
      onErrorVideo();
    }
    setError(t('playError', { lng: playerLanguage }));
  };

  const setMuttedAction = (value) => {
    if (videoComponent.current) {
      setMuted(value);
      setShowControlVolume(false);
      videoComponent.current.muted = value;
    }
  };

  const setVolumeAction = (value) => {
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

  const controllScreenTimeOut = () => {
    if (!autoControllCloseEnabled) {
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

    timerRef.current = setTimeout(controllScreenTimeOut, 5000);
  };

  const getKeyBoardInteration = (e) => {
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
    const element = listReproduction.current;
    if (element) {
      const selected = element.getElementsByClassName('selected')[0];
      const position = selected.offsetTop;
      const height = selected.offsetHeight;
      element.scrollTop = position - height * 2;
    }
  };

  const onChangePlayBackRate = (value) => {
    if (videoComponent.current) {
      const speed = value === 'Normal' ? 1 : +value;
      videoComponent.current.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

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
    document.addEventListener('keydown', getKeyBoardInteration, false);
    playerElement.current && playerElement.current.addEventListener('fullscreenchange', setStateFullScreen, false);
  }, []);

  useEffect(() => {
    setStateFullScreen();
  }, [document.fullscreenElement]);

  function renderLoading() {
    return (
      <div className="loading" style={{ color: primaryColor }}>
        <div>
          <div />
          <div />
          <div />
        </div>
      </div>
    );
  }

  function renderInfoVideo() {
    return (
      <div
        className={`standby-info ${showInfo && videoReady && !playing ? 'show' : ''}`}
        style={{ fontFamily }}
      >
        {(title || subTitle) && (
          <section className="center">
            <h3 className="text">{t('youAreWatching', { lng: playerLanguage })}</h3>
            <h1 className="title" style={{ color: primaryColor }}>
              {title}
            </h1>
            <h2 className="sub-title" style={{ color: secundaryColor }}>
              {subTitle}
            </h2>
          </section>
        )}
        <footer>{t('paused', { lng: playerLanguage })}</footer>
      </div>
    );
  }

  function renderCloseVideo() {
    return (
      <div
        className={`video-preloading ${(!videoReady || (videoReady && error)) ? 'show' : ''} ${
          error ? 'show-error' : ''
        }`}
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
                    {qualities.map((item) => (
                      <div key={item.id} onClick={() => onChangeQuality(item.id)}>
                        {item.prefix && <span>HD</span>}
                        <span>{item.nome}</span>
                        {item.playing && <FiCheck />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div
      className={`container ${fullPlayer ? 'full-player' : ''}`}
      onMouseMove={hoverScreen}
      ref={playerElement}
      onDoubleClick={chooseFullScreen}
      style={{ fontFamily }}
    >
      {(waitingBuffer && playing && !error && !end) && renderLoading()}

      {overlayEnabled && renderInfoVideo()}

      {renderCloseVideo()}

      <video
        ref={videoComponent}
        src={src}
        controls={false}
        onCanPlay={startVideo}
        onTimeUpdate={timeUpdate}
        onError={erroVideo}
        onEnded={onEndedFunction}
        style={{ opacity: error ? 0 : 1 }}
      />

      <div
        className={`controls ${showControls && videoReady && !error ? 'show' : ''}`}
        style={{ '--primary-color': primaryColor }}
      >
        {backButton && (
          <div className="back">
            <div onClick={backButton} style={{ cursor: 'pointer' }}>
              <FaArrowLeft />
              <span>{t('goBack', { lng: playerLanguage })}</span>
            </div>
          </div>
        )}

        {!showControlVolume && !showQuality && !showDataNext && !showReproductionList && (
          <div className="line-reproduction">
            <input
              type="range"
              value={progress}
              className="progress-bar"
              max={duration}
              onChange={(e) => goToPosition(+e.target.value)}
              title=""
            />
            <span>{secondsToHms(duration - progress)}</span>
          </div>
        )}

        {videoReady && (
          <div className="controlls">
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

              {!muted && (
                <div
                  className="volume-controll item-control"
                  onMouseLeave={() => setShowControlVolume(false)}
                >
                  {showControlVolume && (
                    <div className="volumn-controll">
                      <div className="box-connector" />
                      <div className="box">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={volume}
                          onChange={(e) => setVolumeAction(+e.target.value)}
                          title=""
                        />
                      </div>
                    </div>
                  )}

                  {volume >= 60 && (
                    <FaVolumeUp
                      onMouseEnter={() => setShowControlVolume(true)}
                      onClick={() => setMuttedAction(true)}
                    />
                  )}

                  {volume < 60 && volume >= 10 && (
                    <FaVolumeDown
                      onMouseEnter={() => setShowControlVolume(true)}
                      onClick={() => setMuttedAction(true)}
                    />
                  )}

                  {volume < 10 && volume > 0 && (
                    <FaVolumeOff
                      onMouseEnter={() => setShowControlVolume(true)}
                      onClick={() => setMuttedAction(true)}
                    />
                  )}

                  {volume <= 0 && (
                    <FaVolumeMute
                      onMouseEnter={() => setShowControlVolume(true)}
                      onClick={() => setVolumeAction(0)}
                    />
                  )}
                </div>
              )}

              {muted && (
                <div className="item-control">
                  <FaVolumeMute onClick={() => setMuttedAction(false)} />
                </div>
              )}

              <div className="item-control info-video">
                <span className="info-first">{titleMedia}</span>
                <span className="info-secund">{extraInfoMedia}</span>
              </div>
            </div>

            <div className="end">
              {playbackRateEnable && (
                <div className="item-control" onMouseLeave={() => setShowPlaybackRate(false)}>
                  {showPlaybackRate && (
                    <div className="item-playback-rate">
                      <div>
                        <div className="title">{t('speeds', { lng: playerLanguage })}</div>
                        {playbackRateOptions.map((item) => (
                          <div key={item} className="item" onClick={() => onChangePlayBackRate(item)}>
                            {(+item === +playbackRate || (item === 'Normal' && +playbackRate === 1)) && <FiCheck />}
                            <div className="bold">{item === 'Normal' ? item : `${item}x`}</div>
                          </div>
                        ))}
                      </div>
                      <div className="box-connector" />
                    </div>
                  )}

                  <div
                    className="icon-playback-rate playbackRate"
                    onMouseEnter={() => setShowPlaybackRate(true)}
                  >
                    <span>
                      {playbackRate === 'Normal' ? '1' : `${playbackRate}`}
                      <small>x</small>
                    </span>
                  </div>
                </div>
              )}

              {onNextClick && (
                <div className="item-control" onMouseLeave={() => setShowDataNext(false)}>
                  {showDataNext && dataNext.title && (
                    <div className="item-next">
                      <div>
                        <div className="title">{t('nextEpisode', { lng: playerLanguage })}</div>
                        <div className="item" onClick={onNextClick}>
                          <div className="bold">{dataNext.title}</div>
                          {dataNext.description && <div>{dataNext.description}</div>}
                        </div>
                      </div>
                      <div className="box-connector" />
                    </div>
                  )}

                  <FaStepForward onClick={onNextClick} onMouseEnter={() => setShowDataNext(true)} />
                </div>
              )}

              <div className="item-control" onMouseLeave={() => setShowReproductionList(false)}>
                {showReproductionList && (
                  <div className="item-list-reproduction">
                    <div>
                      <div className="title">{t('playlist', { lng: playerLanguage })}</div>
                      <div ref={listReproduction} className="list-list-reproduction scroll-clean-player">
                        {reprodutionList.map((item, index) => (
                          <div
                            key={item.id}
                            className={`item-list-reproduction ${item.playing ? 'selected' : ''}`}
                            onClick={() =>
                              onClickItemListReproduction && onClickItemListReproduction(item.id, item.playing)
                            }
                          >
                            <div className="bold">
                              <span style={{ marginRight: 15 }}>{index + 1}</span>
                              {item.nome}
                            </div>

                            {item.percent && <div className="percent" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="box-connector" />
                  </div>
                )}
                {reprodutionList && reprodutionList.length > 1 && (
                  <FaClone onMouseEnter={() => setShowReproductionList(true)} />
                )}
              </div>

              {qualities && qualities.length > 1 && (
                <div className="item-control" onMouseLeave={() => setShowQuality(false)}>
                  {showQuality && (
                    <div className="item-list-quality">
                      <div>
                        {qualities &&
                          qualities.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setShowQuality(false);
                                onChangeQuality(item.id);
                              }}
                            >
                              {item.prefix && <span>HD</span>}
                              <span>{item.nome}</span>
                              {item.playing && <FiCheck />}
                            </div>
                          ))}
                      </div>
                      <div className="box-connector" />
                    </div>
                  )}

                  <FaCog onMouseEnter={() => setShowQuality(true)} />
                </div>
              )}

              <div className="item-control">
                {!fullScreen && <FaExpand onClick={enterFullScreen} />}
                {fullScreen && <FaCompress onClick={exitFullScreen} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
