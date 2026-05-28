import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import './styles.css';

/**
 * This React component demonstrates how the vanilla JavaScript logic from script.js 
 * can be structured in a modern React application.
 * 
 * Key React concepts used here:
 * 1. useState: Manages the state of the model, detection status, threshold, and history.
 * 2. useRef: Holds mutable references to DOM elements (video, canvas) without triggering re-renders, 
 *            as well as keeping track of the media stream and animation frame.
 * 3. useEffect: Handles side effects like loading the AI model when the component first mounts.
 */
const DetectionDashboard = () => {
    // ---- State Management ----
    const [model, setModel] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
    const [history, setHistory] = useState([]);
    
    // ---- Refs ----
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const requestRef = useRef(null);
    const lastDetectionTime = useRef(0);

    // ---- Load Model on Mount ----
    useEffect(() => {
        const loadModel = async () => {
            try {
                const loadedModel = await cocoSsd.load();
                setModel(loadedModel);
            } catch (err) {
                console.error("Failed to load model", err);
            }
        };
        loadModel();
        
        // Cleanup function when component unmounts
        return () => {
            stopCamera();
        };
    }, []);

    // ---- Camera Controls ----
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setIsDetecting(true);
            
            // Start the detection loop
            detectFrame();
        } catch (err) {
            console.error("Camera access denied", err);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        
        setIsDetecting(false);
        
        // Clear canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    // ---- Detection Logic ----
    const detectFrame = async (timestamp) => {
        if (!videoRef.current || !model || !isDetecting) return;

        // Throttle detection (e.g., every 120ms) to save performance
        if (timestamp - lastDetectionTime.current >= 120) {
            lastDetectionTime.current = timestamp;

            const predictions = await model.detect(videoRef.current);
            
            // Filter by confidence threshold
            const filteredPredictions = predictions.filter(p => p.score >= confidenceThreshold);

            drawDetections(filteredPredictions);
            updateHistory(filteredPredictions);
        }

        // Keep looping
        requestRef.current = requestAnimationFrame(detectFrame);
    };

    // ---- Canvas Drawing ----
    const drawDetections = (predictions) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        predictions.forEach(p => {
            // Draw Box
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 3;
            ctx.strokeRect(p.bbox[0], p.bbox[1], p.bbox[2], p.bbox[3]);

            // Draw Label
            ctx.fillStyle = '#00f2fe';
            ctx.font = '16px sans-serif';
            ctx.fillText(
                `${p.class.toUpperCase()} ${(p.score * 100).toFixed(0)}%`, 
                p.bbox[0], 
                p.bbox[1] > 10 ? p.bbox[1] - 5 : 10
            );
        });
    };

    // ---- Update History State ----
    const updateHistory = (predictions) => {
        if (predictions.length > 0) {
            const timeString = new Date().toLocaleTimeString();
            const newDetections = predictions.map(p => ({
                class: p.class,
                confidence: p.score,
                timestamp: timeString
            }));
            
            // Update state: add new items to the front and limit to 100 items
            setHistory(prev => [...newDetections, ...prev].slice(0, 100));
        }
    };

    // ---- Render Component ----
    return (
        <div className="container">
            <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-content">
                    <h1>AI Surveillance Dashboard (React)</h1>
                    <p>Real-time Object Detection in React</p>
                </div>
                <div className="status-badge">
                    Status: {model ? (isDetecting ? 'Detecting Live' : 'Ready') : 'Loading AI Model...'}
                </div>
            </header>
            
            <main className="main-grid">
                {/* Video / Canvas Panel */}
                <section className="detection-panel">
                    <div className="video-container" style={{ position: 'relative', width: 640, height: 480, margin: '0 auto' }}>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            muted 
                            playsInline 
                            width="640" 
                            height="480"
                            style={{ position: 'absolute', top: 0, left: 0 }}
                        />
                        <canvas 
                            ref={canvasRef} 
                            width="640" 
                            height="480" 
                            style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }} 
                        />
                    </div>
                    
                    <div className="detection-controls" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                        <button 
                            className="btn btn-primary" 
                            onClick={startCamera} 
                            disabled={isDetecting || !model}
                        >
                            Start Camera
                        </button>
                        <button 
                            className="btn btn-danger" 
                            onClick={stopCamera} 
                            disabled={!isDetecting}
                        >
                            Stop Camera
                        </button>
                    </div>

                    <div className="control-group" style={{ marginTop: '20px' }}>
                        <label>Confidence Threshold: {confidenceThreshold.toFixed(1)}</label>
                        <input 
                            type="range" 
                            min="0.1" 
                            max="1" 
                            step="0.1" 
                            value={confidenceThreshold} 
                            onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))} 
                        />
                    </div>
                </section>

                {/* History Panel */}
                <section className="results-panel">
                    <h3>Recent Detections</h3>
                    <div className="results-list">
                        {history.length === 0 ? (
                            <div className="no-results">No detections yet.</div>
                        ) : (
                            history.slice(0, 10).map((item, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #333' }}>
                                    <span><strong>{item.class.toUpperCase()}</strong> ({Math.round(item.confidence * 100)}%)</span>
                                    <span style={{ color: '#888', fontSize: '0.85rem' }}>{item.timestamp}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default DetectionDashboard;
