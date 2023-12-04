export interface VideoPacket {
    data: ArrayBuffer;
    timestamp: number;
    keyframeTimestamp: number;
    isKeyframe: boolean;
}
