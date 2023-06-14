import React, { useState, useRef, useEffect } from 'react';
import FileReaderInput from 'react-file-reader-input';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import SyncLoader from 'react-spinners/SyncLoader';

const boxStyle = {
  border: "1px solid #ccc",
  borderRadius: "5px",
  padding: "1rem",
  margin: "0.5rem",
};

const App = () => {
  // const [sessionId, setSessionId] = useState(uuidv4().toString());
  const sessionId = "test";

  const [image, setImage] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [interiorImage, setInteriorImage] = useState(null);
  const [samImage, setSamImage] = useState(null);
  const [points, setPoints] = useState([]);
  const [imageRatio, setImageRatio] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth/2, height: window.innerHeight - 200 });
  
  const [addOptionState, setAddOptionState] = useState({mode: '', id: -1});
  const [newOptionName, setNewOptionName] = useState('');
  const [interiorOptions, setInteriorOptions] = useState([]);


  // const [lines, setLines] = useState([]);
  // const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  const radius = 5;
  
  axios.defaults.baseURL = "http://127.0.0.1:5001";

  const interiorImageChange = async (e, results) => {
    results.forEach(result => {
      const [e, file] = result;
      const reader = new FileReader();
      reader.onloadend = async function () {
        const reader_image = new Image();
        reader_image.src = reader.result;
        reader_image.onload = async function (){
          console.log(reader_image.width, reader_image.height)

          // 이미지의 가로세로 비율을 계산
          const hRatio = canvasSize.width / reader_image.width;
          const vRatio = canvasSize.height / reader_image.height;
          const ratio  = Math.min(hRatio, vRatio);
          setImageRatio(ratio);
          setCanvasSize({ width: reader_image.width * ratio, height: reader_image.height * ratio });

          setInteriorImage(reader_image);
          setMainImage(reader_image);
          setImage('interior');
          try {
            const response = await axios.post('/upload_interior', { image : reader.result, sessionId : sessionId });
            console.log(response.data.message)
            const sam_image = new Image();
            sam_image.src = response.data.sam_result;
            sam_image.onload = () => setSamImage(sam_image);
          } catch (error) {
            console.error(error);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const markSegmentPoint = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log(mainImage.width)
    // 이미지의 가로세로 비율에 따른 좌표 계산
    const imageX = (x - canvasSize.width / 2) / imageRatio + mainImage.width / 2;
    const imageY = (y - canvasSize.height / 2) / imageRatio + mainImage.height / 2;

    // 계산된 좌표 출력
    console.log('Image Coordinate:', imageX, imageY);
    setPoints([...points, { x: imageX, y: imageY, mode: e.nativeEvent.which == 1 ? 1 : 0 }]);
  }

  const saveSegmentPoints = async () => {
    console.log(points)
    try {
      const canvas = canvasRef.current;
      const response = await axios.post('/save_segment_points', { image : canvas.toDataURL(), points: points, sessionId : sessionId });
      console.log(response.data.message);
      setInteriorOptions(interiorOptions.map((option) => {
        if (option.id === addOptionState.id) {
          return {...option, image: response.data.masked_image, points: points, }
        } else {
          return option
        }
      }))
      setAddOptionState({mode: '', id: -1})
      setPoints([]);
    } catch (error) {
      console.error(error);
    }
  };

  // const handleMouseDown = (e) => {
  //   setIsDrawing(true);
  //   setLines([...lines, { start: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }, end: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY } }]);
  // };

  // const handleMouseMove = (e) => {
  //   if (!isDrawing) return;
  //   const newLines = [...lines];
  //   newLines[newLines.length - 1].end = {
  //     x: e.nativeEvent.offsetX,
  //     y: e.nativeEvent.offsetY,
  //   };
  //   setLines(newLines);
  // };

  // const handleMouseUp = () => {
  //   setIsDrawing(false);
  // };

  useEffect(() => {
    axios.post('/create_directory', { sessionId : sessionId })
      .then(response => console.log(response.data))
      .catch(error => console.error(error));
  }, []);

  useEffect(() => {
    console.log(interiorOptions)
    if (mainImage == null) {
      if (image == 'interior') {
        setMainImage(interiorImage);
      } else if (image == 'sam') {
        setMainImage(samImage);
      }
      return;
    }
    
    const img = new Image();
    img.src = mainImage.src;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    img.onload = () => {

      const centerX = canvasSize.width / 2;
      const centerY = canvasSize.height / 2;

      // 이미지의 가로세로 비율에 맞게 사이즈를 조정
      const newWidth = img.width * imageRatio;
      const newHeight = img.height * imageRatio;

      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.drawImage(img, centerX - newWidth/2, centerY - newHeight/2, newWidth, newHeight);
      for (let point of points) {
        // 이미지 중심점 계산
        const imageCenterX = img.width / 2;
        const imageCenterY = img.height / 2;

        // 이미지에서의 상대적인 좌표 계산
        const relativeX = (point.x - imageCenterX) * imageRatio;
        const relativeY = (point.y - imageCenterY) * imageRatio;

        // canvas에서의 실제 좌표 계산
        const canvasX = centerX + relativeX;
        const canvasY = centerY + relativeY;

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, radius, 0, 2 * Math.PI, false);
        if (point.mode === 1) {
          ctx.fillStyle = '#00FF00';
        } else if (point.mode === 0) {
          ctx.fillStyle = '#FF0000';
        }
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#003300';
        ctx.stroke();
      }
      // for (let line of lines) {
      //   ctx.beginPath();
      //   ctx.moveTo(line.start.x, line.start.y);
      //   ctx.lineTo(line.end.x, line.end.y);
      //   ctx.stroke();
      // }
    };
  }, [image, mainImage, samImage, interiorOptions, points]);
  // }, [lines, image, samImage, interiorImage]);

  const saveDrawing = async () => {
    try {
      const canvas = canvasRef.current;
      const image_drawing = canvas.toDataURL();
      const response = await axios.post('/save_drawing', { image : image_drawing, sessionId : sessionId });
      console.log(response.data.message);
    } catch (error) {
      console.error(error);
    }
  };


  const [dragging, setDragging] = useState(false);

  const add_texture = async (id, texture) => {
    const newInteriorOptions = await Promise.all(interiorOptions.map(async (option) => {
      if (option.id == id) {
        try {
          const response = await axios.post('/apply_texture', { masked_image : option.image, texture : texture, sessionId : sessionId });
          console.log(response.data.message)
          // const sam_image = new Image();
          // sam_image.src = response.data.sam_result;
          // sam_image.onload = () => setSamImage(sam_image);
        } catch (error) {
          console.error(error);
        }
        return {...option, texture: texture }
      } else {
        return option
      }
    }));
    setInteriorOptions(newInteriorOptions);
    setDragging(false);
  }

  const handleFileUpload = (e, id) => {
    const reader = new FileReader();
    reader.onloadend = function () {
      add_texture(id, reader.result);
    }
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleFileDrop = async (e, id) => {
    e.preventDefault();
    add_texture(id, URL.createObjectURL(e.dataTransfer.files[0]))
  };

  const addOption = () => {
    if(interiorImage == null){
      alert('인테리어 이미지를 먼저 선택해주세요.');
      return;
    }
    if(newOptionName == ''){
      alert('옵션 이름을 입력해주세요.');
      return;
    }
    const id = interiorOptions.length == 0 ? 0 : interiorOptions[interiorOptions.length - 1].id + 1;
    setAddOptionState({mode: 'point', id: id})
    setImage('sam');
    setMainImage(samImage);
    setInteriorOptions([...interiorOptions, {id: id, name: newOptionName}]);
    setNewOptionName('');
  };
  return (
    <>
      {addOptionState.mode === 'point' && 
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
        }}/>
      }
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          gridTemplateRows: "repeat(4, 1fr)",
          gap: "0.5rem",
          height: "100vh",
          boxSizing: "border-box",
          padding: "0.5rem",
          position: "relative",
        }}
      >
        <div style={{ gridColumn: "1 / 2", gridRow: "1 / 5", ...boxStyle }}>
          <h2>Interior</h2>
          <input type="text" value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} />
          <button onClick={addOption}>Add Option</button>
          {interiorOptions.map(({id, name, image, texture}, i) => (
            <div style={boxStyle} key={id}>
              <h3>{name}</h3>
                {
                  image ? 
                  <div style={{display: "flex", alignItems: "center"}}>
                    <img key={id+'segment'} src={image} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px" }} />
                    <p style={{margin: "0 20px"}}>+</p>
                    {texture ?
                    <img key={id+'texture'} src={texture} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px" }} />:
                    <>
                      <input type="file" onChange={(e) =>handleFileUpload(e, id)} style={{display:"none"}} id="fileUpload"/>
                      <label for="fileUpload" style={{...dragging? { 
                          border: "2px solid blue", 
                          backgroundColor: "rgba(0, 0, 255, 0.1)" 
                        } : {}, width: "100px", height: "100px", border: "1px dashed black", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: "5px"}}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleFileDrop(e, id)}>
                        Upload your<br/>texture<br/>Click or Drag and Drop
                      </label>
                    </>
                  }
                  </div>:
                  <h5>Indicate a point on the interior for segmentation.</h5>
                }
            </div>
          ))}
        </div>
        <div style={{ gridColumn: "2 / 3", gridRow: "1 / 5", ...boxStyle, position: "relative"}}>
          <h2>Room Design
            <button>
              <span role="img" aria-label="undo">↩️</span>
            </button>
            <button>
              <span role="img" aria-label="redo">↪️</span>
            </button>
          </h2>
          {image !==null ? 
          <>
            {image == 'interior'?
              <button onClick={() => {setImage('sam');setMainImage(samImage)}}>Show SAM</button>:
              <button onClick={() => {setImage('interior');setMainImage(interiorImage)}}>Show Interior</button>
            }
            {
              image == 'sam' && samImage == null?
              //div with width: canvasSize.width, height: canvasSize.height
              <div style={{width: canvasSize.width, height: canvasSize.height, display: "flex", alignItems: "center", justifyContent: "center"}}>
                <SyncLoader color="#36d7b7"/>
              </div>:
              <div>
                <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center',}}>
                  <canvas 
                  ref={canvasRef}
                  id="canvas" 
                  width={canvasSize.width} 
                  height={canvasSize.height}
                  onMouseDown={addOptionState.mode == 'point' ? markSegmentPoint : null}
                  // onMouseDown={handleMouseDown}
                  // onMouseMove={handleMouseMove}
                  // onMouseUp={handleMouseUp}
                  // onMouseOut={handleMouseUp}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{zIndex:1001}}
                  // style={addOptionState.mode == 'point' ? {
                  //   boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.5)', position: "relative", zIndex: "1" 
                  // }:null}
                  />
                </div>
                {addOptionState.mode == 'point'?
                <>
                  <button onClick={() => setPoints(points.slice(0, -1))} style={{zIndex:1001, position: 'relative', marginTop: "5px"}}>Undo</button>
                  <button onClick={saveSegmentPoints} style={{zIndex:1001, position: 'relative', marginTop: "5px"}}>Apply</button>
                </>:null}
              </div>
            }
          </>
          :
          <FileReaderInput as="binary" onChange={interiorImageChange}>
            <button>Select an image</button>
          </FileReaderInput>
          }
        </div>
        <div style={{ gridColumn: "3 / 4", gridRow: "1 / 5", ...boxStyle }}>
          <h2>AI Recommend</h2>
        </div>
      </div>
    </>
  );
};

export default App;
