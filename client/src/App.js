import React, { useState, useRef, useEffect } from 'react';
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
  const [sessionId, setSessionId] = useState('individual/'+uuidv4().toString());
  // const sessionId = "test";
  const [enabled, setEnabled] = useState(false)
  const [image, setImage] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [interiorImage, setInteriorImage] = useState(null);
  const [samImage, setSamImage] = useState(null);
  const [points, setPoints] = useState([]);
  const [imageRatio, setImageRatio] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth/2, height: window.innerHeight - 200 });
  
  const [addOptionState, setAddOptionState] = useState({mode: '', id: -1});
  const [addOptionStateHistory, setAddOptionStateHistory] = useState([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [interiorOptions, setInteriorOptions] = useState([]);


  // const [lines, setLines] = useState([]);
  // const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  const radius = 5;
  
  axios.defaults.baseURL = "http://localhost:5001";
  const interiorImageChange = async (e) => {
    const file = e.target.files[0];
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
    const newPoints = [...points, { x: imageX, y: imageY, mode: e.nativeEvent.which == 1 ? 1 : 0 }];
    setPoints(newPoints);
    saveSegmentPoints(newPoints);
  }

  const addOption = (id) => {
    if(interiorImage == null){
      alert('인테리어 이미지를 먼저 선택해주세요.');
      return;
    }

    if(id == -1){
      setImage('sam');
      setMainImage(samImage);
      id = interiorOptions.length == 0 ? 0 : interiorOptions[interiorOptions.length - 1].id + 1;
      setAddOptionState({mode: 'point', id: id,mask_image: null, mask_image_history: [],masked_image:null, masked_image_history: []})
      setInteriorOptions([...interiorOptions, {id: id}])
    }
    else if (id == -2){
      if(newOptionName == ''){
        alert('인테리어의 종류를 선택해 주세요');
        return;
      }
      if(addOptionState.mask_image == null){
        alert('인테리어의 마스크 이미지를 선택해 주세요');
        return;
      }
      setImage('interior');
      setMainImage(interiorImage);
      const newInteriorOptions = interiorOptions.map((option) => {
        if (option.id === addOptionState.id) {
          return {...addOptionState, name: newOptionName, History: addOptionStateHistory}
        } else {
          return option
        }
      })
      setInteriorOptions(newInteriorOptions)
      setAddOptionState({mode: '', id: -1})
      setAddOptionStateHistory([])
      setPoints([])
      setNewOptionName('')
    }
    else if(id == -3){
      const newInteriorOptions = interiorOptions.filter((option) => option.id != addOptionState.id)
      setInteriorOptions(newInteriorOptions)
      setImage('interior');
      setMainImage(interiorImage);
      setAddOptionState({mode: '', id: -1})
      setAddOptionStateHistory([])
      setPoints([])
      setNewOptionName('')
    }
    else {
      setImage('interior');
      setMainImage(interiorImage);
      const option = interiorOptions.find((option) => option.id == id);
      setPoints(option.points)
      setNewOptionName(option.name)
      // set addoptionstate with option without histroy
      setAddOptionState({...option, History: null})
      setAddOptionStateHistory(option.History)
    }
    // if(newOptionName == ''){
    //   alert('옵션 이름을 입력해주세요.');
    //   return;
    // }
  };

  const eraseLastPoint = () => {
    if(points.length == 0){
      alert('점이 없습니다.');
      return;
    }
    const newPoints = points.slice(0,- 1);
    const newAddOptionState = {...addOptionState, mask_image: addOptionState.mask_image_history[addOptionState.mask_image_history.length - 1], masked_image: addOptionState.masked_image_history[addOptionState.masked_image_history.length - 1], masked_image_history: addOptionState.masked_image_history.slice(0,- 1), mask_image_history: addOptionState.mask_image_history.slice(0,- 1), points: newPoints}
    console.log(newAddOptionState)
    setPoints(newPoints);
    setAddOptionState(newAddOptionState);
  }
  const saveSegmentPoints = async (points) => {
    if(points.length == 0){
      alert('점을 선택해주세요.');
      return;
    }
    setImage('interior');
    setMainImage(interiorImage);
    setAddOptionState({...addOptionState, mode: 'loading', masked_image: null, mask_image: null, points: points})  
    try {
      const canvas = canvasRef.current;
      const response = await axios.post('/save_segment_points', { image : canvas.toDataURL(), points: points, sessionId : sessionId });
      console.log(response.data.message);
      setAddOptionState({...addOptionState, mode: 'point', masked_image: response.data.masked_image, mask_image: response.data.mask_image, mask_image_history: addOptionState.mask_image_history.concat([addOptionState.mask_image]), masked_image_history: addOptionState.masked_image_history.concat([addOptionState.masked_image]), points: points})
      // setInteriorOptions(interiorOptions.map((option) => {
      //   if (option.id === addOptionState.id) {
      //     return {...option, masked_image: response.data.masked_image, mask_image: response.data.mask_image, points: points, }
      //   } else {
      //     return option
      //   }
      // }))
      // setAddOptionState({mode: '', id: -1})
      // setPoints([]);
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
    console.log(addOptionState);
    if (mainImage == null) {
      if (image == 'interior') {
        setMainImage(interiorImage);
      } else if (image == 'sam') {
        setMainImage(samImage);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;

    const img = new Image();
    img.src = mainImage.src;
    img.onload = () => {
      // 이미지의 가로세로 비율에 맞게 사이즈를 조정
      const newWidth = img.width * imageRatio;
      const newHeight = img.height * imageRatio;

      ctx.drawImage(img, centerX - newWidth/2, centerY - newHeight/2, newWidth, newHeight);
      
      const drawPoints = () => {
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
      }
      if (addOptionState.mode != '') {
        if(addOptionState.mask_image != null) {
          const img = new Image();
          if(addOptionState.mode == 'texture' && addOptionState.textured_mask != null) {
            img.src = addOptionState.textured_mask;
          } else {
            img.src = addOptionState.mask_image;
          }
          img.onload = () => {
            // 이미지의 가로세로 비율에 맞게 사이즈를 조정
            const newWidth = img.width * imageRatio;
            const newHeight = img.height * imageRatio;
            ctx.drawImage(img, centerX - newWidth/2, centerY - newHeight/2, newWidth, newHeight);
            if(addOptionState.mode != 'texture' && addOptionState.mode != 'textured_loading') {
              drawPoints();
            }
          }
        }
        else {
          drawPoints();
        }
      }

    for (let option of interiorOptions) {
      if (option.textured_mask != null) {
        const img = new Image();
        img.src = option.textured_mask;
        img.onload = () => {
          // 이미지의 가로세로 비율에 맞게 사이즈를 조정
          const newWidth = img.width * imageRatio;
          const newHeight = img.height * imageRatio;
          ctx.drawImage(img, centerX - newWidth/2, centerY - newHeight/2, newWidth, newHeight);
        }
      }
    }
        
      // for (let line of lines) {
      //   ctx.beginPath();
      //   ctx.moveTo(line.start.x, line.start.y);
      //   ctx.lineTo(line.end.x, line.end.y);
      //   ctx.stroke();
      // }
    };
      
  }, [image, mainImage, samImage, interiorOptions, points, addOptionState]);
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
          const response = await axios.post('/apply_texture', { mask_image : option.mask_image, texture : texture, sessionId : sessionId });
          console.log(response.data)
          return {...option, texture: texture, textured_mask: response.data.textured_mask }

        } catch (error) {
          console.error(error);
        }
        return {...option, texture: texture, textured_mask: null }
      } else {
        return option
      }
    }));
    setInteriorOptions(newInteriorOptions);
    setDragging(false);
  }

  const add_texture2 = async (texture) => {
    console.log(texture)
    let newAddOptionState = addOptionState;
    setAddOptionState({...addOptionState, mode: 'textured_loading', texture: texture});
    try {
      const [similarResponse, textureResponse] = await Promise.all([
        axios.post('/similar', { type: newOptionName, sessionId: sessionId, texture: texture }),
        axios.post('/apply_texture', { mask_image: addOptionState.mask_image, texture: texture, sessionId: sessionId })
      ]);
    
      console.log(similarResponse.data);
      console.log(textureResponse.data);
    
      newAddOptionState = {
        ...newAddOptionState,
        texture: texture,
        recommend: similarResponse.data.similar_images,
        textured_mask: textureResponse.data.textured_mask,
        mode: 'texture',
      };
      
    } catch (error) {
      console.error(error);
    }
    setAddOptionStateHistory([...addOptionStateHistory, addOptionState]);
    setAddOptionState(newAddOptionState);
    setDragging(false);
    
  }
      
  const handleFileUpload = (e, id) => {
    const reader = new FileReader();
    reader.onloadend = function () {
      add_texture(id, reader.result);
    }
    reader.readAsDataURL(e.target.files[0]);
  };
  const handleFileUpload2 = (e) => {
    console.log(e.target)
    const reader = new FileReader();
    reader.onloadend = function () {
      add_texture2(reader.result);
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
    handleFileUpload(e, id);
  };

  const handleFileDrop2 = async (e) => {
    e.preventDefault();
    handleFileUpload2(e);
  };

  return (
    <>
      {/* {addOptionState.mode === 'point' && 
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
        }}/>
      } */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "repeat(4, 1fr)",
          gap: "0.5rem",
          height: "100vh",
          boxSizing: "border-box",
          padding: "0.5rem",
          position: "relative",
        }}
      >
      <div style={{ gridColumn: "1 / 2", gridRow: "1 / 5", ...boxStyle, position: "relative"}}>
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
            <button onClick={() => {setImage('sam');setMainImage(samImage)}}>Segmented Image</button>:
            <button onClick={() => {setImage('interior');setMainImage(interiorImage)}}>Interior</button>
          }
          {
            image == 'sam' && samImage == null?
            //div with width: canvasSize.width, height: canvasSize.height
            <div style={{width: canvasSize.width, height: canvasSize.height, display: "flex", alignItems: "center", justifyContent: "center"}}>
              <SyncLoader color="#36d7b7"/>
            </div>:
            <div>
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center',}}>
                <div style={{ position: 'relative' }}>
                  <canvas 
                  ref={canvasRef}
                  id="canvas" 
                  width={canvasSize.width} 
                  height={canvasSize.height}
                  onMouseDown={addOptionState.mode == 'point' && newOptionName != '' ? markSegmentPoint : null}
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
                  {(addOptionState.mode == 'loading' || addOptionState.mode == 'textured_loading') &&
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}>
                        <SyncLoader color="#36d7b7" />
                    </div>
                }
                </div>
              </div>
            </div>
          }
        </>
        :
        <>
          <input type="file" id="fileInput" onChange={interiorImageChange} multiple style={{display: "none"}} />
          <button onClick={() => document.getElementById('fileInput').click()}>Upload</button>
        </>
        }
      </div>
        <div style={{ gridColumn: "2 / 3", gridRow: "1 / 5", ...boxStyle }}>
          
          {image !==null ?
          <>
            {addOptionState.mode != '' ?
            <>
              <h2>Interior</h2>
              <div style={{...boxStyle, position: 'relative'}}>
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if(window.confirm("Are you sure you want to stop defining new interiors?")) {
                    addOption(-3)
                  }
                }}>
                  X
                </div>
                <h3>1. Select Type</h3>
                <select value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)}>
                  <option value="">--Please choose an option--</option>
                  <option value="Wallpaper">Wallpaper</option>
                  <option value="Floor">Floor</option>
                  <option value="Ceiling">Ceiling</option>
                </select>
                {newOptionName != '' &&
                <>
                  <h3>2. Plot points in the image for Masking</h3>
                  <p style={{ marginLeft: "20px" }}>Left-Click to include in your mask.</p>
                  <p style={{ marginLeft: "20px" }}>Right-Click to exclude from your mask.</p>
                  <p style={{ marginLeft: "20px" }}>If you're happy with your mask, click 'Apply'.</p>
                  {addOptionState.mode != 'texture' && addOptionState.mode != 'textured_loading' ?
                  <>
                    <button onClick={eraseLastPoint} style={{zIndex:1001, position: 'relative', marginTop: "5px"}}>Erase Latest Point</button>
                    <button onClick={async () => {
                      if(points.length == 0){
                        alert('점을 선택해주세요.');
                        return;
                      }
                      setAddOptionState({...addOptionState, mode:'textured_loading'});
                      if(addOptionState.texture == null){
                        try {
                          const res = await axios.post('/similar', {type: newOptionName, sessionId: sessionId, texture: null});
                          console.log(res.data);
                          setAddOptionState({...addOptionState, mode:'texture', recommend: res.data.similar_images});
                        }
                        catch (err) {
                          console.log(err);
                        }
                      } else {
                        try {
                          const res = await axios.post('/apply_texture', { mask_image: addOptionState.mask_image, texture: addOptionState.texture, sessionId: sessionId })
                          console.log(res.data);
                          setAddOptionState({...addOptionState, mode: 'texture', textured_mask: res.data.textured_mask});
                        }
                        catch (err) {
                          console.log(err);
                        }
                      }
                    }} disabled={addOptionState.mode == 'loading' || points.length == 0}>Apply</button>
                  </>:
                  <>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <h3>3. Choose your texture</h3>
                      <button onClick={() => {
                        setAddOptionState({...addOptionState, mode:'point'});
                        setAddOptionStateHistory([]);
                        }}>Back to masking</button>
                    </div>
                    {addOptionState.texture == null?
                    <>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <input type="file" onChange={handleFileUpload2} style={{display:"none"}} id="fileUpload"/>
                        <label for="fileUpload" 
                          style={{
                            ...dragging? { 
                              border: "2px solid #4285F4", 
                              backgroundColor: "rgba(66, 133, 244, 0.1)" 
                            } : {}, 
                            width: "100px", 
                            height: "100px", 
                            border: "2px dashed #CCC", 
                            borderRadius: "5px",
                            display: "flex", 
                            flexDirection: "column", 
                            // alignItems: "center", 
                            justifyContent: "center", 
                            cursor: "pointer", 
                            padding: "5px",
                            boxShadow: "0px 0px 5px 2px rgba(0,0,0,0.1)",
                            color: "#666"
                          }}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleFileDrop2}>
                          Click<b/>or<b/>Drag & Drop
                        </label>
                        <p>To Upload your Texture Image</p>
                      </div>
                      <p>Recommended Texture ( Click image to apply )</p>
                      {addOptionState.mode != 'textured_loading' ? addOptionState.recommend.map((img, i) => (
                        <img key={i} src={img} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px" }} onClick={() => add_texture2(img)}/>
                      )):<div style={{margin:'20px'}}><SyncLoader color="#36d7b7" style={{margin:'20px'}}/></div>}
                    </>: 
                    <>
                      <img key={'texture'} src={addOptionState.texture} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px" }} />
                      <p>Similar Texture ( Click image to apply )</p>
                      {addOptionState.recommend.map((img, i) => (
                        <img key={i} src={img} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px" }} onClick={() => add_texture2(img)}/>
                      ))}
                    </>
                    }
                    <div></div>
                    <button onClick={() => {
                      if(addOptionStateHistory.length == 0){
                        alert('더 이상 되돌릴 수 없습니다.');
                        return;
                      }
                      setAddOptionState(addOptionStateHistory[addOptionStateHistory.length - 1]);
                      setAddOptionStateHistory(addOptionStateHistory.slice(0, addOptionStateHistory.length - 1));
                    }} disabled={addOptionState.mode == 'textured_loading'}>Undo</button>
                    <button onClick={() => addOption(-2)} disabled={addOptionState.mode == 'textured_loading'}>Apply</button>
                  </>
                  }
                </>
                }
              </div>
            </>
            :
            <>
              <div style={{display: "flex", alignItems: "center"}}>
                <h2>Interior</h2>
                <button onClick={() => addOption(-1)} style={{marginLeft: '20px'}}>+</button>
              </div>
              {interiorOptions.map(({id, name, mask_image, texture, textured_mask}, i) => (
                <div style={{...boxStyle, position: 'relative'}} key={id}>
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if(window.confirm("Are you sure you want to delete this?")) {
                      setInteriorOptions(interiorOptions.filter((option) => option.id != id));
                    }
                  }}>
                    X
                  </div>
                  <h3>{name}</h3>
                  <div style={{display: "flex", alignItems: "center", justifyContent:'center'}}>
                    <img key={id+'segment'} src={mask_image} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px", border: "0.5px solid black" }} onClick={() => addOption(id)}/>
                    <p style={{margin: "0 20px"}}>+</p>
                    {texture ?
                    <>
                      <img key={id+'texture'} src={texture} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px" }} onClick={() => addOption(id)} />
                      {
                        textured_mask ?
                        <>
                          <p style={{margin: "0 20px"}}>=</p>
                          <img key={id+'textured_mask'} src={textured_mask} style={{ width: "100px", height: "100px", objectFit: "cover", margin:"3px", border: "0.5px solid black" }} onClick={() => addOption(id)} />
                        </>: null
                      }
                    </>
                    :
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
                  </div>
                </div>
              ))}
            </>}
          </>: null}
        </div>
      </div>
    </>
  );
};

export default App;
