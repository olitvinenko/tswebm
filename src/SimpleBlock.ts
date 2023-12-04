import { AudioPacket } from './AudioPacket';
import { DataInterface } from './DataInterface/DataInterface';
import { VideoPacket } from './VideoPacket';

enum Lacing {
    NO_LACING = 0,
    XIPH_LACING = 1,
    FIXED_LACING = 2,
    EBML_LACING = 3
}

export class SimpleBlock {
    public cluster: any;
    public dataInterface: any; // = dataInterface;
    public offset: any; // = blockHeader.offset;
    public dataOffset: any; // = blockHeader.dataOffset;
    public siz: any; // = blockHeader.size;
    public end: any; // = blockHeader.end;
    public loaded = false;
    public trackNumber: any = null;
    public timeCode: any = -1;
    public flags = null;
    public keyFrame = false;
    public invisible = false;
    public lacing: Lacing = Lacing.NO_LACING;
    public discardable = false;
    public lacedFrameCount = null;
    public headerSize: any = null;
    public frameSizes = [];
    public tempCounter: any = null;
    public tempFrame = null;
    public track: any = null;
    public frameLength: any = null;
    public isLaced = false;
    public stop = null; // = this.offset + this.size;
    public status = false;
    public ebmlLacedSizes: any[] = [];
    public ebmlParsedSizes: any[] = [];
    public ebmlLacedSizesParsed = false;

    public trackEntries: any;
    public videoPackets: VideoPacket[] = [];
    public audioPackets: AudioPacket[] = [];
    public laceFrameHelper: any = null;
    public lacedFrameHeaderSize: any = null;
    public lacedFrameDataSize: any = null;
    public fixedFrameLength: any = null;
    public firstLacedFrameSize: any = null;
    public ebmlTotalSize: any;
    public size: any;

    public constructor() {
        this.dataInterface; // = dataInterface;
        this.offset; // = blockHeader.offset;
        this.dataOffset; // = blockHeader.dataOffset;
        this.size; // = blockHeader.size;
        this.end; // = blockHeader.end;
    }

    public init(offset: any, size: any, end: any, dataOffset: any, dataInterface: DataInterface, cluster: any): void {
        this.cluster = cluster;
        this.dataInterface = dataInterface;
        this.offset = offset;
        this.dataOffset = dataOffset;
        this.size = size;
        this.end = end;
        this.loaded = false;
        this.trackNumber = null;
        this.timeCode = null;
        this.flags = null;
        this.keyFrame = false;
        this.invisible = false;
        this.lacing = Lacing.NO_LACING;
        this.discardable = false;
        this.lacedFrameCount = null;
        this.headerSize = null;
        this.frameSizes = [];
        this.tempCounter = null;
        this.tempFrame = null;
        this.track = null;
        this.frameLength = null;
        this.isLaced = false;
        this.stop = this.offset + this.size;
        this.status = true;
        this.trackEntries = this.cluster.demuxer.tracks.trackEntries;
        this.videoPackets = this.cluster.demuxer.videoPackets;
        this.audioPackets = this.cluster.demuxer.audioPackets;
        this.laceFrameHelper = null;
        this.lacedFrameHeaderSize = null;
        this.ebmlLacedSizes = [];
        this.lacedFrameDataSize = null;
        this.fixedFrameLength = null;
        this.firstLacedFrameSize = null;
        this.ebmlParsedSizes = [];
        this.ebmlLacedSizesParsed = false;
    }

    public reset(): void {
        this.status = false;
    }

    public loadTrack(): void {
        this.track = this.trackEntries[this.trackNumber - 1];
    }

    public load(): boolean {
        const dataInterface = this.dataInterface;
        if (this.loaded) {
            throw new Error('ALREADY LOADED');
        }

        if (this.trackNumber === null) {
            this.trackNumber = dataInterface.readVint();
            if (this.trackNumber === null) return false;
            this.loadTrack();
        }

        if (this.timeCode === null) {
            this.timeCode = dataInterface.readUnsignedInt(2); //Be signed for some reason?
            if (this.timeCode === null) return false;
        }

        if (this.flags === null) {
            /// FIX THIS
            this.flags = dataInterface.readUnsignedInt(1);
            if (this.flags === null) return false;

            this.keyFrame = ((this.flags >> 7) & 0x01) === 0 ? false : true;
            this.invisible = ((this.flags >> 2) & 0x01) === 0 ? true : false;
            this.lacing = (this.flags & 0x06) >> 1;
            if (this.lacing > 3 || this.lacing < 0) throw 'INVALID LACING';
        }

        if (!this.headerSize) this.headerSize = dataInterface.offset - this.dataOffset;

        switch (this.lacing) {
            case Lacing.FIXED_LACING: {
                if (!this.frameLength) {
                    this.frameLength = this.size - this.headerSize;
                    if (this.frameLength <= 0) throw `INVALID FRAME LENGTH ${this.frameLength}`;
                }
                if (!this.lacedFrameCount) {
                    this.lacedFrameCount = dataInterface.readUnsignedInt(1);
                    if (this.lacedFrameCount === null) return false;
                    this.lacedFrameCount++;
                }

                let tempFrame = dataInterface.getBinary(this.frameLength - 1);
                if (tempFrame === null) {
                    //if (dataInterface.usingBufferedRead === false)
                    //    throw "SHOULD BE BUFFERED READ";
                    //console.warn("frame has been split");
                    return false;
                }

                this.fixedFrameLength = (this.frameLength - 1) / this.lacedFrameCount;
                const fullTimeCode = this.timeCode + this.cluster.timeCode;
                //var fullTimeCode = this.cluster.timeCode;
                const timeStamp = fullTimeCode / 1000;
                if (timeStamp < 0) {
                    throw 'INVALID TIMESTAMP';
                }

                for (let i = 0; i < this.lacedFrameCount; i++) {
                    if (this.track.trackType === 1) {
                        this.videoPackets.push({
                            //This could be improved
                            data: tempFrame.slice(
                                i * this.fixedFrameLength,
                                i * this.fixedFrameLength + this.fixedFrameLength
                            ),
                            timestamp: timeStamp,
                            keyframeTimestamp: timeStamp,
                            isKeyframe: this.keyFrame
                        });
                    } else if (this.track.trackType === 2) {
                        this.audioPackets.push({
                            //This could be improved
                            data: tempFrame.slice(
                                i * this.fixedFrameLength,
                                i * this.fixedFrameLength + this.fixedFrameLength
                            ),
                            timestamp: timeStamp
                        });
                    }
                }
                tempFrame = null;
                break;
            }
            case Lacing.EBML_LACING: {
                if (!this.frameLength) {
                    this.frameLength = this.size - this.headerSize;
                    if (this.frameLength <= 0) throw `INVALID FRAME LENGTH ${this.frameLength}`;
                }
                if (!this.lacedFrameCount) {
                    this.lacedFrameCount = dataInterface.readUnsignedInt(1);
                    if (this.lacedFrameCount === null) return false;
                    this.lacedFrameCount++;
                }
                if (!this.firstLacedFrameSize) {
                    const firstLacedFrameSize = this.dataInterface.readVint();
                    if (firstLacedFrameSize !== null) {
                        this.firstLacedFrameSize = firstLacedFrameSize;
                        this.ebmlLacedSizes.push(this.firstLacedFrameSize);
                    } else {
                        return false;
                    }
                }
                if (!this.tempCounter) {
                    this.tempCounter = 0;
                }

                while (this.tempCounter < this.lacedFrameCount - 1) {
                    const frameSize = dataInterface.readLacingSize();
                    if (frameSize === null) return false;
                    this.ebmlLacedSizes.push(frameSize);
                    this.tempCounter++;
                }

                // Now parse the frame sizes
                if (!this.ebmlLacedSizesParsed) {
                    this.ebmlParsedSizes[0] = this.ebmlLacedSizes[0];
                    let total = this.ebmlParsedSizes[0];
                    for (let i = 1; i < this.lacedFrameCount - 1; i++) {
                        this.ebmlParsedSizes[i] = this.ebmlLacedSizes[i] + this.ebmlParsedSizes[i - 1];
                        total += this.ebmlParsedSizes[i];
                    }
                    if (!this.lacedFrameDataSize) this.lacedFrameDataSize = this.end - dataInterface.offset;

                    const lastSize = this.lacedFrameDataSize - total;
                    this.ebmlParsedSizes.push(lastSize);
                    this.ebmlLacedSizesParsed = true;
                    this.ebmlTotalSize = total + lastSize;
                }
                let tempFrame = dataInterface.getBinary(this.lacedFrameDataSize);
                if (tempFrame === null) {
                    return false;
                }

                const fullTimeCode = this.timeCode + this.cluster.timeCode;
                //var fullTimeCode = this.cluster.timeCode;
                const timeStamp = fullTimeCode / 1000;
                if (timeStamp < 0) {
                    throw 'INVALID TIMESTAMP';
                }

                let start = 0;
                let end = this.ebmlParsedSizes[0];
                for (let i = 0; i < this.lacedFrameCount; i++) {
                    if (this.track.trackType === 1) {
                        this.videoPackets.push({
                            //This could be improved
                            data: tempFrame.slice(start, end),
                            timestamp: timeStamp,
                            keyframeTimestamp: timeStamp,
                            isKeyframe: this.keyFrame
                        });
                    } else if (this.track.trackType === 2) {
                        this.audioPackets.push({
                            //This could be improved
                            data: tempFrame.slice(start, end),
                            timestamp: timeStamp
                        });
                    }

                    start += this.ebmlParsedSizes[i];
                    end += this.ebmlParsedSizes[i];
                    if (i === this.lacedFrameCount - 1) {
                        end = null;
                    }
                }
                this.tempCounter = null;
                tempFrame = null;
                break;
            }
            case Lacing.XIPH_LACING:
            case Lacing.NO_LACING: {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (this.lacing === Lacing.EBML_LACING) {
                    console.warn('EBML_LACING');
                }
                if (this.lacing === Lacing.XIPH_LACING) {
                    console.warn('XIPH_LACING');
                }
                if (!this.frameLength) {
                    this.frameLength = this.size - this.headerSize;
                    if (this.frameLength <= 0) throw `INVALID FRAME LENGTH ${this.frameLength}`;
                }

                let tempFrame = dataInterface.getBinary(this.frameLength);
                if (tempFrame === null) {
                    //if (dataInterface.usingBufferedRead === false)
                    //    throw "SHOULD BE BUFFERED READ " + dataInterface.offset;
                    //console.warn("frame has been split");
                    return false;
                } else {
                    if (dataInterface.usingBufferedRead === true) throw 'SHOULD NOT BE BUFFERED READ';

                    if (tempFrame.byteLength !== this.frameLength) throw 'INVALID FRAME';
                }

                const fullTimeCode = this.timeCode + this.cluster.timeCode;
                //var fullTimeCode = this.cluster.timeCode;
                const timeStamp = fullTimeCode / 1000;
                if (timeStamp < 0) {
                    throw 'INVALID TIMESTAMP';
                }

                if (this.track.trackType === 1) {
                    this.videoPackets.push({
                        //This could be improved
                        data: tempFrame,
                        timestamp: timeStamp,
                        keyframeTimestamp: timeStamp,
                        isKeyframe: this.keyFrame
                    });
                } else if (this.track.trackType === 2) {
                    this.audioPackets.push({
                        //This could be improved
                        data: tempFrame,
                        timestamp: timeStamp
                    });
                }

                tempFrame = null;
                break;
            }
            default:
                console.log(this);
                console.warn('LACED ELEMENT FOUND');
                throw 'STOP HERE';
        }

        if (this.end !== dataInterface.offset) {
            throw new Error('INVALID BLOCK SIZE');
        }

        this.loaded = true;
        this.headerSize = null;
        this.tempFrame = null;
        this.tempCounter = null;
        this.frameLength = null;

        return true;
    }
}
