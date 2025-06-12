## ✅ Pre-Release Production Tasks

-  **Resolve All TODOs**
    
    - Ensure all feature-gated content is implemented or cleanly disabled.
        
    - Eliminate known critical and high-severity bugs.
        
    - Remove or refactor debug/test scaffolding.
        
-  **Finalize Core Game Loop**
    
    - Refine pacing, difficulty curves, and progression.
        
    - Polish UI/UX in all scenes (main menu, pause menu, hub, builder, mission flow).
        
    - Complete onboarding/tutorial content.
        
-  **Level & Mission Design**
    
    - Create and validate 8–10 _dense_ multi-objective missions, or 20+ curated single-objective ones.
        
    - Ensure variety in biome, enemy composition, and mission mechanics.
        
    - Balance for both challenge and player agency.
        
-  **Implement Save/Load System**
    
    - Multi-slot saves with integrity checks.
        
    - Ensure compatibility for future patches (version stamping and schema handling).
        
-  **Polish Gamepad Support**
    
    - Full parity with mouse/keyboard input.
        
    - Steam Deck compatibility.

## 🧪 Testing & Quality Assurance

-  **Internal Playtesting**
    
    - Balance tuning, progression feel, onboarding difficulty.
        
-  **Closed Alpha**
    
    - Recruit ~10–20 trusted testers.
        
    - Use structured feedback forms and/or Discord channels.
        
-  **Bug Tracking System**
    
    - GitHub Issues, Notion, or a dedicated Trello board.
        
    - Triage pipeline (priority, reproducibility, severity).
        
-  **Performance Optimization**
    
    - Profile for memory usage, garbage collection, and GPU usage.
        
    - Ensure consistent frame rate at 1080p/60fps on target minimum spec.
        
-  **Cross-Platform Validation**
    
    - Windows 10, Windows 11, Steam Deck.
        
    - Optional: Linux via Proton (if feasible).

## 🔧 Technical & Deployment Tasks

-  **Integrate Steam SDK**
    
    - Achievements, cloud saves, rich presence, overlay testing.
        
    - Steam Input configuration.
        
-  **Steam Developer Setup**
    
    - Create developer account and pay onboarding fee.
        
    - Upload builds using `SteamPipe`.
        
    - Configure depots, manifests, build scripts.
        
-  **DRM / Executable Protection**
    
    - Optional: Use `steam_api.dll`-based validation or other light protections.
        
-  **Crash Reporting**
    
    - Integrate Sentry, Rollbar, or custom crash logger with symbol support.
        
-  **Itch.io Build for Demo**
    
    - Standalone demo with ~15–30 mins of gameplay.
        
    - Disable upgrade/progression beyond initial segments.

## 📢 Marketing & Community Engagement

-  **Steam Page Creation**
    
    - Trailer (90s and ~30s), screenshots, detailed description, minimum specs.
        
    - Launch "Coming Soon" page at least 3–6 months before release.
        
-  **Early Access Strategy (Optional)**
    
    - Define scope of EA build: systems ready, what's incomplete, roadmap.
        
    - Prepare disclaimers and community expectations.
        
-  **Wishlist Funnel Campaign**
    
    - Create a consistent messaging campaign:
        
        - Teasers
            
        - Dev logs
            
        - Feature highlights
            
        - Mechanics breakdown
            
-  **Social Media & Community Activation**
    
    - YouTube devlogs and gameplay showcases
        
    - Twitter/X: GIFs, WIP previews, progress milestones
        
    - Discord: Invite system, dev AMA, tester role
        
    - Reddit (e.g., r/roguelikes, r/indiegames)
        
    - TikTok: Short-form content with fast gameplay loops
        
    - Twitch streamers and Steam stream support
        
    - Facebook/Instagram only if time permits or for paid ad funnel
        
-  **Press Kit & Outreach**
    
    - Prepare a polished press kit: logo, screenshots, trailer, description, contact.
        
    - Send outreach to influencers, curators, streamers ~1–2 months pre-release.

## 🏁 Final Release Execution

-  **Launch Steam Page**
    
    - Include definitive release date.
        
    - Tie launch announcement to trailer or significant demo drop.
        
-  **Submit for Steam Review**
    
    - Valve must approve your page and final builds.
        
-  **Final Testing Pass**
    
    - Regression testing, Steam feature check, localization (if applicable).
        
-  **Upload Release Candidate**
    
    - Lock build, verify depots, test auto-update logic.
        
-  **Launch Day Support Plan**
    
    - Real-time issue tracking channel
        
    - Hotfix pipeline for day-0 bugs
        
    - Community presence for feedback and sentiment
        
-  **Post-Launch**
    
    - Patch cadence plan (e.g., weekly patches for 1 month)
        
    - Community-driven roadmap updates
        
    - Postmortem: collect stats on retention, crash rates, wishlist-to-sale conversion
