import logo from './logo.svg';
import './App.css';
// import ReactNetflixPlayer from './componenets/Player/js/ReactNetflixPlayer';
import ReactNetflixPlayer from './componenets/Player/ts/index.tsx';

function App() {
  // Dummy data for testing
  const qualities = [
    { id: '1080p', name: '1080p', prefix: 'HD', playing: true },
    { id: '720p', name: '720p', prefix: 'HD', playing: false },
    { id: '480p', name: '480p', prefix: '', playing: false },
  ];

  const reproductionList = [
    { id: 1, name: 'Episode 1', playing: true },
    { id: 2, name: 'Episode 2', playing: false },
    { id: 3, name: 'Episode 3', playing: false },
  ];

  const dataNext = {
    title: 'Episode 2',
    description: 'Next episode description',
  };

  return (
    <div className="App">
      <ReactNetflixPlayer
        title="Sample Show"
        subTitle="Season 1"
        titleMedia="Episode 1"
        extraInfoMedia="42 min"
        playerLanguage="en"
        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" // Sample video URL
        autoPlay={false}
        primaryColor="#03dffc"
        secondaryColor="#ffffff"
        fontFamily="Arial, sans-serif"
        playbackRateOptions={['0.5', 'Normal', '1.5', '2']}
        qualities={qualities}
        reproductionList={reproductionList}
        dataNext={dataNext}
        onNextClick={() => alert('Next episode clicked')}
        onChangeQuality={(id) => alert(`Quality changed to ${id}`)}
        onClickItemListReproduction={(id, playing) => alert(`Item ${id} clicked`)}
        onErrorVideo={() => alert('Error occurred during video playback')}
        onEnded={() => alert('Video ended')}
        backButton={() => alert('Back button clicked')}
        overlayEnabled={true}
      />
    </div>
  );
}

export default App;
