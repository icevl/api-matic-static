module.exports = {
  "*.{ts,js}": [() => "tsc --skipLibCheck --noEmit", "eslint --cache --fix", "prettier --write"],
  "*.json": ["prettier --write"]
}
