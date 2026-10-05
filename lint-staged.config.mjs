// Prettier d'abord (normalise le format), puis ESLint --fix : sans
// eslint-config-prettier, l'ordre historique recommandé est de laisser
// Prettier en dernier mot ; ici ESLint ne porte aucune règle de style
// (eslint-config-next) donc les deux passes ne se contredisent pas.
const lintStagedConfig = {
  '*.{ts,tsx,js,mjs}': ['prettier --write', 'eslint --fix'],
  '*.{json,css,yml,yaml}': ['prettier --write'],
}

export default lintStagedConfig
