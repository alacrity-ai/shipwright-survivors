// src/game/tutorials/interfaces/TutorialSlide.ts

export interface TutorialSlide {
  id: string;
  imagePath: string; // asset-relative path; drawUIImageBox will resolve/fetch safely
  caption?: string;  // optional, single-line caption under image
}
