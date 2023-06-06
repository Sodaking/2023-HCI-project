import React, { useState } from "react";
import recommendation1 from './images/recommendation1.png';
import recommendation2 from './images/recommendation2.png';
import recommendation3 from './images/recommendation3.png';
import defaultImage from './images/default.png';
import image1 from './images/1.png';
import image2 from './images/2.png';
import image3 from './images/3.png';
import image4 from './images/4.png';
import image5 from './images/5.png';
import image6 from './images/6.png';
import samImage from './images/canvas.png';

const boxStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: "5px",
  padding: "1rem",
  margin: "0.5rem",
};

const App: React.FC = () => {
  const [roomDesign, setRoomDesign] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<{[key: string]: string[]}>({});
  const [recommendImages, setRecommendImages] = useState<{[key: string]: string}>({});
  const [interiorImages, setInteriorImages] = useState<{[key: string]: string[]}>({});
  const [interiorImageIndices, setInteriorImageIndices] = useState<{[key: string]: number}>({
    'Wallpaper': 0,
    'Floor': 0,
    'Ceiling': 0,
  });
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [roomDesignHistory, setRoomDesignHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);
  const [showsam, setShowsam] = useState<boolean>(false);
  
  
  
  const roomDesignImages = [image1, image2, image3, image4, image5, image6];
  const interiorOptions = ['Floor', 'Wallpaper', 'Ceiling'];
  const aiOptions = ['Recommendation 1', 'Recommendation 2', 'Recommendation 3'];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, option: string) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const newImages = { ...uploadedImages };
        if (!newImages[option]) newImages[option] = [];
        newImages[option].push(e.target?.result as string);
        setUploadedImages(newImages);
        if (option == 'Room Design') {
          handleImageSelection(e.target?.result as string);
          setRoomDesign(e.target?.result as string);
        }
      };

      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handleImageSelection = (image: string) => {
    const newHistory = [...roomDesignHistory.slice(0, currentHistoryIndex + 1), image];
    setRoomDesignHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
    setRoomDesign(image);
    setRecommendImages({
      'Recommendation 1': recommendation1,
      'Recommendation 2': recommendation2,
      'Recommendation 3': recommendation3,
    });
  };
  const handleDefaultImage = () => {
    handleImageSelection(defaultImage);
  };

  const interiorImageLinks : {[key: string]: string[]}
   = {
    'Wallpaper': [
      'https://static.planner5d.com/textures/wallp_1000.jpg',
      'https://static.planner5d.com/textures/wallp_39.jpg',
      'https://static.planner5d.com/textures/tile_1002.jpg',
    ],
    'Floor': [
      'https://static.planner5d.com/textures/prkt_1042.jpg',
      'https://static.planner5d.com/textures/prkt_1000.jpg',
    ],
    'Ceiling': [
      'https://static.planner5d.com/textures/stucco_1003.jpg',
    ],
  };

  const addNextInteriorImage = (option: string) => {
    setShowsam(false);
    const currentIndex = interiorImageIndices[option];
    if (currentIndex < interiorImageLinks[option].length) {
      const newImages = { ...interiorImages };
      if (!newImages[option]) newImages[option] = [];
      newImages[option].push(interiorImageLinks[option][currentIndex]);
      setInteriorImages(newImages);

      setInteriorImageIndices({
        ...interiorImageIndices,
        [option]: currentIndex + 1,
      });
    }
  };
  const handleInteriorImageClick = (option: string, image: string) => {
    setShowsam(false);
    setSelectionOrder([...selectionOrder, option]);
    if (selectionOrder.length < roomDesignImages.length) {
      const newImage = roomDesignImages[selectionOrder.length];
      const newHistory = [...roomDesignHistory.slice(0, currentHistoryIndex + 1), newImage];
      setRoomDesignHistory(newHistory);
      setCurrentHistoryIndex(newHistory.length - 1);
      setRoomDesign(newImage);
    }
  };

  const handleAIImageClick = (option: string, image: string) => {
    setShowsam(false);
    const newImage = image
    const newHistory = [...roomDesignHistory.slice(0, currentHistoryIndex + 1), newImage];
    setRoomDesignHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
    setRoomDesign(newImage);
  };
  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(currentHistoryIndex - 1);
      setRoomDesign(roomDesignHistory[currentHistoryIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < roomDesignHistory.length - 1) {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
      setRoomDesign(roomDesignHistory[currentHistoryIndex + 1]);
    }
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr 1fr",
        gridTemplateRows: "repeat(4, 1fr)",
        gap: "0.5rem",
        height: "100vh",
        boxSizing: "border-box",
        padding: "0.5rem",
      }}
    >
      <div style={{ gridColumn: "1 / 2", gridRow: "1 / 5", ...boxStyle }}>
        <h2>Interior</h2>
        {interiorOptions.map((option, i) => (
          <div style={boxStyle} key={i}>
            <h3>{option}
              <button onClick={() => addNextInteriorImage(option)}>
                Add {option} Image
              </button>
            </h3>
            {interiorImages[option] && interiorImages[option].map((image, index) => (
              <img key={index} src={image} alt={option} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px" }} onDragEnd={() => handleInteriorImageClick(option, image)} onClick={() => handleInteriorImageClick(option, image)} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ gridColumn: "2 / 3", gridRow: "1 / 5", ...boxStyle }}>
        <h2>Room Design
          <button onClick={handleUndo}>
            <span role="img" aria-label="undo">↩️</span>
          </button>
          <button onClick={handleRedo}>
            <span role="img" aria-label="redo">↪️</span>
          </button>
          
        </h2>
        {roomDesign != "" ? <></> : <button onClick={handleDefaultImage}>
            Select Room Image
          </button> }
        {roomDesign == "" ? <></> :
          <>
            <button onClick={() => setShowsam(!showsam)}>
              Show Segmented Image
            </button> 
            {
              showsam ? <img key={samImage} src={samImage} alt="Room Design" style={{ width: "100%", height: "100%", objectFit: "contain", margin: "auto" }} /> 
              : <img key={roomDesign} src={roomDesign} alt="Room Design" style={{ width: "100%", height: "100%", objectFit: "contain", margin: "auto" }} />
            }
            
          </>
          }
      </div>
      <div style={{ gridColumn: "3 / 4", gridRow: "1 / 5", ...boxStyle }}>
        <h2>AI Recommend</h2>
        {roomDesign != "" && aiOptions.map((option, i) => (
          <div key={i}>
            <h3>{option}</h3>
            {recommendImages[option] && (
              <img src={recommendImages[option]} alt={option} style={{ width: "250px", height: "250px", objectFit: "cover", margin:"auto", display:"block" }} onClick={() => handleAIImageClick(option,recommendImages[option])} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;