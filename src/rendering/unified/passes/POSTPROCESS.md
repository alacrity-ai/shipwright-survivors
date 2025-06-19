// Usage example in your renderer
import { PostProcessPass, CinematicGradingParams } from '@/rendering/unified/passes/PostProcessPass';

// Initialize post-process pass
const postProcess = new PostProcessPass(gl, canvas.width, canvas.height);

// Define cinematic grading parameters for different moods:

// Warm cinematic look (like modern blockbusters)
const warmCinematic: CinematicGradingParams = {
  exposure: 1.1,
  contrast: 1.15,
  saturation: 1.1,
  temperature: 0.15,      // Slightly warm
  tint: -0.05,           // Slight magenta tint
  vignetteStrength: 0.25,
  filmGrainStrength: 0.08,
  shadowsLift: 0.02,
  highlightsGain: 1.05
};

// Cool cinematic look (like sci-fi films)
const coolCinematic: CinematicGradingParams = {
  exposure: 0.95,
  contrast: 1.2,
  saturation: 0.9,
  temperature: -0.2,     // Cool/blue
  tint: 0.1,            // Green tint
  vignetteStrength: 0.4,
  filmGrainStrength: 0.12,
  shadowsLift: -0.05,
  highlightsGain: 1.1
};

// Vintage film look
const vintageFilm: CinematicGradingParams = {
  exposure: 1.05,
  contrast: 1.3,
  saturation: 1.2,
  temperature: 0.25,     // Warm like old film
  tint: -0.1,
  vignetteStrength: 0.5,
  filmGrainStrength: 0.2, // Heavy grain
  shadowsLift: 0.1,
  highlightsGain: 0.9
};

// In your render loop:
function render() {
  // ... your normal rendering ...
  
  // Apply post-processing effects
  // You can chain multiple effects together
  postProcess.run(sceneTexture, [
    'bloom',              // Add bloom first
    'cinematicGrading'    // Then apply cinematic grading
  ], warmCinematic);      // Use warm cinematic parameters
  
  // Or use multiple effects:
  // postProcess.run(sceneTexture, [
  //   'chromaticAberration',
  //   'bloom',
  //   'cinematicGrading'
  // ], coolCinematic);
}

// For real-time adjustment (great for debugging/tweaking):
const cinematicControls: CinematicGradingParams = {
  exposure: 1.0,
  contrast: 1.1,
  saturation: 1.05,
  temperature: 0.0,
  tint: 0.0,
  vignetteStrength: 0.3,
  filmGrainStrength: 0.1,
  shadowsLift: 0.0,
  highlightsGain: 1.0
};

// You can modify these values in real-time via UI controls
// cinematicControls.temperature = sliderValue;