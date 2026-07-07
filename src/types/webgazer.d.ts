// Minimal typing for webgazer (ships no types). We only use a handful of methods.
declare module 'webgazer' {
  export interface GazeData {
    x: number;
    y: number;
  }
  export interface WebGazer {
    setRegression(name: 'ridge' | 'weightedRidge' | 'threadedRidge'): WebGazer;
    setGazeListener(cb: (data: GazeData | null, elapsedTime: number) => void): WebGazer;
    clearGazeListener(): WebGazer;
    begin(): Promise<WebGazer>;
    end(): WebGazer;
    pause(): WebGazer;
    resume(): WebGazer;
    isReady(): boolean;
    saveDataAcrossSessions(enabled: boolean): WebGazer;
    applyKalmanFilter(enabled: boolean): WebGazer;
    showVideoPreview(show: boolean): WebGazer;
    showVideo(show: boolean): WebGazer;
    showPredictionPoints(show: boolean): WebGazer;
    showFaceOverlay(show: boolean): WebGazer;
    showFaceFeedbackBox(show: boolean): WebGazer;
    clearData(): void;
    params: Record<string, unknown>;
  }
  const webgazer: WebGazer;
  export default webgazer;
}
