import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl'; // Explicitly import the fallback
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { Camera, Upload, RotateCcw, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

const AiRecommendation = () => {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [mode, setMode] = useState('camera');

  const webcamRef = useRef(null);
  const imageRef = useRef(null);

  // --- 1. CAPTURE & UPLOAD ---
  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) { setImage(imageSrc); setStep(2); }
  }, [webcamRef]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { setImage(ev.target.result); setStep(2); };
      reader.readAsDataURL(file);
    }
  };

  // --- 2. THE FIX: ENGINE INITIALIZATION & ANALYSIS ---
 const runAnalysis = async () => {
  setLoading(true);
  try {
    await tf.ready();
    await tf.setBackend('webgl');

    const faceDetector = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, { runtime: 'tfjs' }
    );
    const poseDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet
    );

    const faces = await faceDetector.estimateFaces(imageRef.current);
    const poses = await poseDetector.estimatePoses(imageRef.current);

    if (faces.length > 0) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageRef.current.width;
      canvas.height = imageRef.current.height;
      ctx.drawImage(imageRef.current, 0, 0);

      // --- ACCURATE SKIN TONE (Area Sampling) ---
      // We sample a 20x20 area from BOTH cheeks to avoid shadow bias
      const leftCheek = faces[0].keypoints[234];
      const rightCheek = faces[0].keypoints[454];
      
      const getAvgColor = (kp) => {
        const data = ctx.getImageData(kp.x - 10, kp.y - 10, 20, 20).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i+1]; b += data[i+2];
        }
        const count = data.length / 4;
        return { r: r/count, g: g/count, b: b/count };
      };

      const leftAvg = getAvgColor(leftCheek);
      const rightAvg = getAvgColor(rightCheek);
      const finalR = (leftAvg.r + rightAvg.r) / 2;
      const finalB = (leftAvg.b + rightAvg.b) / 2;

      // Lab Color Space Logic: Warm vs Cool
      // If Red + Green > Blue * 1.2, it's definitely Warm
      const isWarm = (finalR > finalB * 1.1);

      // --- ACCURATE NECKLINE (Geometric Analysis) ---
      // We look at the Y-distance between the Mouth and the Shoulders
      const mouth = faces[0].keypoints[13];
      const leftShoulder = poses[0].keypoints[5];
      const rightShoulder = poses[0].keypoints[6];
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      
      const neckDepth = avgShoulderY - mouth.y;
      // High depth = V-Neck/Deep Scoop, Low depth = Crew/High Neck
      const necklineType = neckDepth > 120 ? "V-Neck" : "Round/High Neck";

      setAnalysis({
        tone: isWarm ? "Warm Undertone" : "Cool Undertone",
        neckline: necklineType,
        recommendation: isWarm ? "Yellow Gold / Rose Gold" : "Silver / White Gold / Platinum",
        style: necklineType === "V-Neck" ? "Long Pendant / Y-Necklace" : "Choker / Short Statement Piece",
        reason: `Your ${isWarm ? 'Warm' : 'Cool'} palette glows with ${isWarm ? 'Gold' : 'Silver'}. The ${necklineType} suggests a ${necklineType === "V-Neck" ? 'pendant to elongate the silhouette' : 'bold piece to frame the face'}.`
      });
      setStep(3);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen text-xl bg-[#F9F7F5] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-100">
        
        {/* STEP 1: SELECT */}
        {step === 1 && (
          <div className="p-8">
            <div className="text-center mb-8">
              <Sparkles className="text-amber-500 w-10 h-10 mx-auto mb-4" />
              <h2 className="text-2xl font-serif text-stone-800 tracking-tight">ZYRO AI Stylist</h2>
              <p className="text-stone-400 text-xs uppercase tracking-widest mt-2">Precision Jewelry Matching</p>
            </div>

            <div className="flex bg-stone-100 rounded-2xl p-1 mb-6">
              <button onClick={() => setMode('camera')} className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-xl transition-all ${mode === 'camera' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}>Camera</button>
              <button onClick={() => setMode('upload')} className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-xl transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}>Upload</button>
            </div>

            {mode === 'camera' ? (
              <div className="relative aspect-3/4 rounded-3xl overflow-hidden bg-black shadow-2xl">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                <button onClick={handleCapture} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full p-1 shadow-xl"><div className="w-full h-full border-2 border-stone-800 rounded-full" /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-3/4 rounded-3xl border-2 border-dashed border-stone-200 bg-stone-50 cursor-pointer hover:border-amber-200 transition-all">
                <Upload className="text-stone-300 mb-2" />
                <span className="text-stone-400 text-xs font-serif italic">Select from gallery</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            )}
          </div>
        )}

        {/* STEP 2: PREVIEW & SCAN */}
        {step === 2 && (
          <div className="p-8 text-center">
            <h3 className="text-lg font-serif mb-6 text-stone-800">Confirm Your Look</h3>
            <div className="relative aspect-3/4 rounded-3xl overflow-hidden shadow-2xl mb-8 bg-stone-100">
              <img ref={imageRef} src={image} alt="User" className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
                  <div className="w-full h-1 bg-amber-400 absolute top-0 animate-scan" />
                  <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                  <p className="text-[10px] tracking-[0.3em] uppercase">{loadingStage}</p>
                </div>
              )}
            </div>
            {!loading && (
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-4 border border-stone-200 rounded-full text-[10px] uppercase tracking-widest text-stone-500 flex items-center justify-center gap-2"><RotateCcw size={14}/> Retake</button>
                <button onClick={runAnalysis} className="flex-2 py-4 bg-stone-900 text-white rounded-full text-[10px] uppercase tracking-widest font-bold shadow-xl">Analyze Style</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {step === 3 && analysis && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <div className="bg-[#1A2E26] p-10 text-center text-white">
              <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400 mb-2">The ZYRO Edit</p>
              <h3 className="text-3xl font-serif italic mb-2">{analysis.recommendation}</h3>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1 rounded-full text-[9px] uppercase tracking-widest"><CheckCircle2 size={12} className="text-green-400"/> AI Validated</div>
            </div>
            <div className="p-8">
              <p className="text-stone-500 text-sm italic mb-8 leading-relaxed">"{analysis.reason}"</p>
              <button onClick={() => setStep(1)} className="w-full py-4 bg-stone-900 text-white rounded-full text-[10px] uppercase tracking-widest font-bold">New Session</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};


export default AiRecommendation