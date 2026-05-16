declare module 'react-native-sound' {
  class Sound {
    static setCategory(category: string, mixWithOthers?: boolean): void;

    constructor(
      path: string,
      basePath: string,
      callback?: (error: Error | null) => void,
    );

    play(callback?: (success: boolean) => void): void;
    stop(callback?: () => void): void;
    release(): void;
    isLoaded(): boolean;
    getDuration(): number;
  }

  export default Sound;
}
