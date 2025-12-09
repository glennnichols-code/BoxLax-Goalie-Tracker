import { GoogleGenAI } from "@google/genai";
import { Shot, ShotResult } from "../types";

export const analyzeGame = async (shots: Shot[]): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key not configured. Unable to generate AI analysis.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prepare data for the prompt
  const goals = shots.filter(s => s.result === ShotResult.GOAL);
  const saves = shots.filter(s => s.result === ShotResult.SAVE);
  const savePercentage = shots.length > 0 ? (saves.length / shots.length * 100).toFixed(1) : "0";

  // Simplify shot data to save tokens and focus on geometry
  const shotSummary = shots.map(s => ({
    result: s.result,
    originX: Math.round(s.origin.x), // 0 is left board, 100 is right board (approx)
    originY: Math.round(s.origin.y), // 0 is center line, 100 is goal line
    placementX: s.placement ? Math.round(s.placement.x) : 'N/A', // 0 left post, 100 right post
    placementY: s.placement ? Math.round(s.placement.y) : 'N/A', // 0 top bar, 100 floor
    situation: s.situation,
    rebound: s.isRebound
  }));

  const prompt = `
    You are an expert box lacrosse goalie coach. 
    Analyze the following shot data from a single game.
    
    Data Context:
    - Floor Origin X: 0 (Left Boards) to 100 (Right Boards). 50 is center.
    - Floor Origin Y: 0 (Center Line) to 100 (Goal Line).
    - Goal Placement X: 0 (Left Post) to 100 (Right Post). Goalie's perspective.
    - Goal Placement Y: 0 (Top Bar) to 100 (Floor).
    
    Stats:
    - Total Shots: ${shots.length}
    - Saves: ${saves.length}
    - Goals Allowed: ${goals.length}
    - Save Percentage: ${savePercentage}%

    Shot Log (JSON):
    ${JSON.stringify(shotSummary)}

    Please provide a concise "Coach's Report" (max 200 words) using Markdown.
    Focus on:
    1. Weaknesses: Where are goals beating the goalie? (e.g., High Stick Side, 5-hole, Low Glove).
    2. Origin Trends: Where are shots coming from that result in goals? (e.g., The Point, The Crease).
    3. Specific advice for the next period/game.
    
    Tone: Constructive, professional, analytical.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to generate analysis due to a network or API error.";
  }
};
