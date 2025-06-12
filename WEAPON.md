# Making a new weapon

1. Create a new block type in `src\game\blocks\BlockRegistry.ts`
2. Add a new sprite in `src\rendering\cache\blockRenderers`
3. If needed, add a new behavior in `src\game\interfaces\behavior\BlockBehavior.ts`
4. Add a new backend in `src\systems\combat\backends\weapons`
5. Make sure backend is registered in engineruntime to the weaponsystem, and in the aiorchestrator (ship factory)
