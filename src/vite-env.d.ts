/// <reference types="vite/client" />

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.png?url' {
  const content: string;
  export default content;
}
