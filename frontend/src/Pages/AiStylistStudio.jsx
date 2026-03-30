import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, Sparkles, User, Scissors, Shirt, Shield, ChevronRight, AlertCircle } from 'lucide-react';

const necklinePatterns = {
    "V-Neck": { jewelry: "Short Pendant, Lariat, or Y-Necklace", tip: "Follow the V with a pointed pendant." },
    "Sweetheart": { jewelry: "Choker, Pearl Strand, or Coin Necklace", tip: "Mirror the curve with a rounded piece." },
    "Sweetheart with Straps": { jewelry: "V-shape pendant, Simple Choker", tip: "Keep it delicate to not compete with straps." },
    "Square": { jewelry: "3-Strand Necklace, Geometric Statement, Choker", tip: "Angular jewelry complements the straight lines." },
    "Boat Neck": { jewelry: "Long Knotted Necklace, Chandelier Earrings, or Bracelets", tip: "Skip necklaces — earrings shine here." },
    "Asymmetrical": { jewelry: "Threader, Chandelier, or Stud Earrings", tip: "Avoid necklaces entirely; let earrings do the work." },
    "Strapless": { jewelry: "Choker, Short Statement, or Rounded Necklace", tip: "Fill the bare neckline with a bold choker." },
    "U-Shape": { jewelry: "Rounded Statement, Dainty Single Strand, or Long Double Strand", tip: "Match the U curve with a layered look." },
    "Round": { jewelry: "Long Pendant or Opera-length Chain", tip: "Elongate with a long drop pendant." },
    "Halter": { jewelry: "No Necklace — Statement Earrings only", tip: "The halter ties at the neck — earrings steal the show." },
    "Off-Shoulder": { jewelry: "Long Pendant, Body Chain, or Stack Bracelets", tip: "Draw eyes down with length." },
    "Unknown": { jewelry: "Classic Pendant or Stud Earrings", tip: "A versatile pendant works with almost any neckline." },
};

const skinToneMetals = {
    "Fair / Light Cool": { metal: "Silver or White Gold", stone: "Sapphire, Amethyst, or Diamond", hex: "#f5e6d3" },
    "Fair / Light Warm": { metal: "Rose Gold or Yellow Gold", stone: "Morganite, Pearl, or Rose Quartz", hex: "#f0d5be" },
    "Medium Cool": { metal: "Silver, White Gold, or Platinum", stone: "Emerald, Ruby, or Tanzanite", hex: "#c8956c" },
    "Medium Warm": { metal: "Yellow Gold or Bronze", stone: "Citrine, Garnet, or Amber", hex: "#b5784a" },
    "Olive / Neutral": { metal: "Gold or Rose Gold", stone: "Jade, Turquoise, or Coral", hex: "#9a7b5e" },
    "Tan / Deep Warm": { metal: "Yellow Gold or Copper", stone: "Tiger's Eye, Onyx, or Carnelian", hex: "#7a5230" },
    "Deep Cool": { metal: "Gold, Silver, or Bold Gemstones", stone: "Diamond, Amethyst, or Sapphire", hex: "#4a3020" },
    "Deep Warm": { metal: "Yellow Gold or Bronze", stone: "Ruby, Citrine, or Amber", hex: "#3d2010" },
};

const STAGES = [
    "Reading undertones...",
    "Mapping neckline geometry...",
    "Analyzing outfit palette...",
    "Consulting style rules...",
    "Curating your look...",
];

export default function AiStylistStudio() {
    const [image, setImage] = useState(null);
    const [inputMode, setInputMode] = useState('upload');
    const [loading, setLoading] = useState(false);
    const [stageIndex, setStageIndex] = useState(0);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);

    const webcamRef = useRef(null);
    const fileInputRef = useRef(null);

    const cycleStages = () => {
        let i = 0;
        return setInterval(() => {
            i = (i + 1) % STAGES.length;
            setStageIndex(i);
        }, 600);
    };

    const analyzeImage = async (base64Image) => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        
        const convertToJpeg = (base64) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.src = base64;
            });
        };

        const jpegImage = await convertToJpeg(base64Image);
        const imageData = jpegImage.includes(',') ? jpegImage.split(',')[1] : jpegImage;
        const sizeInMB = (base64Image.length * 0.75) / 1024 / 1024;
        
        if (sizeInMB > 20) throw new Error('Image too large. Max 20MB.');

        const response = await fetch(backendUrl+ `/api/products/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData, mediaType: 'image/jpeg' }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Analysis failed');
        return data;
    };

    const handleCapture = useCallback(() => {
        const src = webcamRef.current?.getScreenshot();
        if (src) setImage(src);
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file?.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => setImage(ev.target.result);
        reader.readAsDataURL(file);
    };

    const runAnalysis = async () => {
        if (!image) return;
        setLoading(true);
        setError(null);
        const timer = cycleStages();

        try {
            const result = await analyzeImage(image);
            setAnalysis(result);
        } catch (err) {
            setError(err.message || 'Analysis failed.');
        } finally {
            clearInterval(timer);
            setLoading(false);
        }
    };

    const reset = () => { setImage(null); setAnalysis(null); setError(null); };

    const skin = analysis ? (skinToneMetals[analysis.skinTone] || skinToneMetals["Olive / Neutral"]) : null;
    const neckline = analysis ? (necklinePatterns[analysis.necklineType] || necklinePatterns["Unknown"]) : null;

    return (
        <div className="min-h-screen mt-20 pb-20 bg-[#f8f5f0] flex items-center justify-center p-4 zyro-card-font">
            <div className="max-w-250 w-full bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-wrap min-h-145">
                
                {/* LEFT PANEL */}
                <div className="flex-[0_0_380px] min-w-75 bg-[#f8f5f0] p-6 flex flex-col border-r border-[#ede8e1]">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles size={16} className="text-[#c9a96e]" />
                        <span className="font-cg text-xl tracking-[3px] text-[#1a1208]">ZYRO</span>
                        <span className="text-[10px] para tracking-widest text-gray-500 uppercase mt-1">Stylist</span>
                    </div>

                    <div className="flex-1 rounded-[20px] overflow-hidden bg-[#1a1208] relative min-h-65">
                        {!image ? (
                            inputMode === 'camera' ? (
                                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-[#f0ebe4] hover:bg-[#ede8e1] transition-colors">
                                    <Upload size={28} className="text-[#c9a96e] mb-2 " />
                                    <span className="text-[10px] tracking-widest text-gray-500 uppercase font-medium">Upload Portrait</span>
                                    <span className="text-[11px] text-gray-400 mt-1">JPG, PNG · Max 5MB</span>
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </div>
                            )
                        ) : (
                            <img src={image} className="w-full h-full object-cover" alt="Preview" />
                        )}

                        {loading && (
                            <div className="absolute inset-0 bg-[#1a1208]/75 flex flex-col items-center justify-center gap-3">
                                <div className="spin w-8 h-8 border-2 border-gray-700 border-t-[#c9a96e] rounded-full" />
                                <span className="pulse-dot text-[10px] tracking-widest text-[#c9a96e] uppercase">{STAGES[stageIndex]}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                        {!image && (
                            <div className="flex bg-[#ede8e1] p-1 rounded-xl gap-1">
                                {['upload', 'camera'].map(m => (
                                    <button key={m} onClick={() => setInputMode(m)} className={`flex-1 py-2  text-[10px] tracking-widest uppercase font-medium rounded-lg transition-all ${inputMode === m ? 'bg-white shadow-sm text-[#1a1208]' : 'text-gray-400'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!image && inputMode === 'camera' && (
                            <button onClick={handleCapture} className="py-3 bg-(--color-green) text-white rounded-xl text-[10px] tracking-widest uppercase hover:bg-(--color-gold) font-semibold transition-colors hover:cursor-pointer">
                                Capture Photo
                            </button>
                        )}

                        {image && !analysis && !loading && (
                            <button onClick={runAnalysis} className="py-3.5 bg-[#1a1208] text-[#c9a96e] rounded-xl text-[11px] tracking-[3px] uppercase font-medium flex items-center justify-center gap-2 hover:bg-black transition-colors hover:cursor-pointer">
                                <Sparkles size={13} /> Analyze My Style <ChevronRight size={13} />
                            </button>
                        )}

                        {image && (
                            <button onClick={reset} className="py-2 text-[10px] tracking-widest uppercase text-gray-400 hover:cursor-pointer hover:text-gray-600 transition-colors">
                                Clear & Start Over
                            </button>
                        )}
                    </div>
                    <p className="mt-4 text-[11px] para text-gray-500 text-center leading-relaxed">🔒 Your photo is analyzed instantly and never stored.</p>
                </div>

                {/* RIGHT PANEL */}
                <div className="flex-1 min-w-70 p-10 flex flex-col justify-center">
                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 items-start mb-6">
                            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-red-700 font-semibold">Analysis failed</p>
                                <p className="text-[11px] text-red-400 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {!analysis && !loading && !error && (
                        <div className="text-center py-12">
                            <Shield size={40} className="text-[#eae8e5] mx-auto mb-6" />
                            <p className="italic text-2xl text-gray-400 mb-2">Your style report awaits</p>
                            <p className="text-xs para text-gray-400">Upload a photo to get personalized recommendations</p>
                        </div>
                    )}

                    {loading && !analysis && (
                        <div className="text-center py-12">
                            <p className="font-cg text-2xl text-[#c9a96e] italic mb-2">Reading your aesthetic...</p>
                            <p className="text-[11px] text-gray-400 tracking-wider">{STAGES[stageIndex]}</p>
                        </div>
                    )}

                    {analysis && (
                        <div className="space-y-6">
                            <div className="mb-7 pb-5 border-b border-[#f0ebe4] flex items-end justify-between">
                                <div>
                                    <p className="text-3xl italic">Style Assessment</p>
                                    <p className="text-[11px] text-gray-400 mt-1 tracking-wider">Based on your photo • {analysis.confidence}% confidence</p>
                                </div>
                                <div style={{ background: analysis.outfitColorHex }} className="w-9 h-9 rounded-full border-2 border-white shadow-md shrink-0" title={analysis.outfitColorName} />
                            </div>

                            <div className="space-y-3.5">
                                {/* Neckline Card */}
                                <div className="result-card bg-[#f8f5f0] rounded-[18px] p-4 flex gap-4 items-start" style={{ animationDelay: '0s' }}>
                                    <div className="w-10 h-10 rounded-xl bg-[#e8eeff] flex items-center justify-center shrink-0">
                                        <Scissors size={17} className="text-[#4a6ef5]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] tracking-widest text-[#4a6ef5] uppercase font-bold mb-1">Neckline</p>
                                        <p className="font-cg text-lg font-semibold">{analysis.necklineType}</p>
                                        <p className="text-[14px] para text-gray-800 mt-1">Wear : <span className="text-black font-medium">{neckline?.jewelry}</span></p>
                                        <p className="text-[11px] other text-gray-700   leading-relaxed"><span className='text-gray-500'>Tip : </span>{neckline?.tip}</p>
                                    </div>
                                </div>

                                {/* Skin Tone Card */}
                                <div className="result-card bg-[#f8f5f0] rounded-[18px] p-4 flex gap-4 items-start" style={{ animationDelay: '0.15s' }}>
                                    <div className="w-10 h-10 rounded-xl bg-[#fff3e0] flex items-center justify-center shrink-0">
                                        <User size={17} className="text-[#e0872a]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] tracking-widest text-[#e0872a] uppercase font-bold mb-1">Skin Tone & Metal</p>
                                        <p className="font-cg text-lg font-semibold">{analysis.skinTone}</p>
                                        <p className="text-[14px] para text-gray-800 mt-1">Best metal: <span className="text-black font-medium">{skin?.metal}</span></p>
                                        <p className="text-[14px] para text-gray-800 ">Flattering stones: <span className="text-black font-medium">{skin?.stone}</span></p>
                                    </div>
                                    <div style={{ background: skin?.hex }} className="w-7 h-7 rounded-full border-2 border-white shrink-0 mt-1" />
                                </div>

                                {/* Outfit Card */}
                                <div className="result-card bg-[#f8f5f0] rounded-[18px] p-4 flex gap-4 items-start" style={{ animationDelay: '0.3s' }}>
                                    <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] flex items-center justify-center shrink-0">
                                        <Shirt size={17} className="text-[#3e9c5f]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] tracking-widest text-[#3e9c5f] uppercase font-bold mb-1">Outfit Color</p>
                                        <p className="font-cg text-lg font-semibold">{analysis.outfitColorName} <span className="text-xs text-gray-500 font-normal">({analysis.outfitColorTemp})</span></p>
                                        <p className="text-[13px] para mt-1 leading-relaxed text-black font-medium">
                                            {analysis.outfitColorTemp === 'warm' ? 'Gold and earth-toned jewelry will harmonize beautifully.' :
                                             analysis.outfitColorTemp === 'cool' ? 'Silver, platinum, and cool gemstones will complement this.' :
                                             'Both gold and silver work well with your neutral outfit.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Stylist Note */}
                                <div className="result-card bg-linear-to-br from-[#1a1208] to-[#2d1e0a] rounded-[18px] p-5 flex gap-3 items-start" style={{ animationDelay: '0.45s' }}>
                                    <Sparkles size={15} className="text-[#c9a96e] mt-1 shrink-0" />
                                    <p className=" text-sm tracking-wide text-[#e8dcc8] font-cg leading-[1.65]">
                                        "{analysis.stylistNote}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}