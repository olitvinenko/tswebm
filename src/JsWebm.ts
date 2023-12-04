import { DataInterface } from './DataInterface/DataInterface';
import { SeekHead } from './SeekHead';
import { SegmentInfo } from './SegmentInfo';
import { Tracks } from './Tracks';
import { Cluster } from './Cluster';
import { CuePoint, Cues } from './Cues';
import { ElementHeader } from './ElementHeader';
import { Tags } from './Tags';
import { VideoPacket } from './VideoPacket';
import { AudioPacket } from './AudioPacket';
import { VideoFormat } from './VideoFormat';
import { Track } from './Track';

//States
export enum State {
    INITIAL = 0,
    DECODING = 1,
    SEEKING = 2,
    META_LOADED = 3,
    FINISHED = 4
}

/**
 * @classdesc Wrapper class to handle webm demuxing
 */
export class JsWebm {
    public segmentInfo: SegmentInfo | null = null;
    public state: State = State.INITIAL;
    public videoPackets: VideoPacket[] = [];
    public audioPackets: AudioPacket[] = [];
    public loadedMetadata = false;

    private readonly dataInterface = new DataInterface(this);
    public segment: ElementHeader | null = null;
    public currentElement: ElementHeader | null = null; // placeholder for last element
    public segmentIsLoaded: boolean = false; // have we found the segment position
    public headerIsLoaded: boolean = false;
    public tempElementHeader = new ElementHeader(-1, -1, -1, -1);
    public tracks: Tracks | null = null;
    public currentCluster: Cluster | null = null;
    public seekHead: SeekHead | null = null;

    public cuesLoaded: boolean = false;
    public isSeeking: boolean = false;
    public tempSeekPosition = -1;
    public loadingCues: boolean = false;
    public seekCueTarget: CuePoint | null = null;
    public eof: boolean = false;
    public processing: boolean = false;

    public videoFormat: VideoFormat | null = null;
    public audioFormat: any = null;

    public videoCodec: string | null = null;
    public audioCodec: string | null = null;

    public videoTrack: Track | null = null;
    public audioTrack: Track | null = null;

    public cues: Cues | null = null;

    public tags: Tags | null = null;
    public elementEBML: ElementHeader | null = null;
    public version: number = 0;
    public readVersion: number = 0;
    public maxIdLength: number = 0;
    public maxSizeLength: number = 0;
    public docType: string | null = null;
    public docTypeVersion: number = 0;
    public docTypeReadVersion: number = 0;
    public cuesOffset: number = 0;
    public onseek: ((offset: number) => void) | null = null;
    public seekTime: number = 0;

    public constructor() {
        this.tempElementHeader.reset();
        this.currentElement = null;

        this.seekHead = null;
        this.cuesLoaded = false;
        this.isSeeking = false;
        this.tempSeekPosition = -1;
        this.loadingCues = false;
        this.videoCodec = null;
    }

    public get duration(): number {
        if (!this.segmentInfo || this.segmentInfo.duration < 0) return -1;
        return this.segmentInfo.duration / 1000; // / 1000000000.0; ;
    }

    public get keyframeTimestamp(): number {
        if (this.videoPackets.length > 0) {
            return this.videoPackets[0].keyframeTimestamp;
        } else {
            return -1;
        }
    }

    /**
     *
     * Sets up the meta data validation after
     */
    public validateMetadata(): void {
        let codecID;
        // let channels;
        // let rate;
        let tempTrack = null;
        //Multiple video tracks are allowed, for now just return the first one
        if (this.tracks) {
            for (const i in this.tracks.trackEntries) {
                const trackEntry = this.tracks.trackEntries[i];
                if (trackEntry.trackType === 2) {
                    tempTrack = trackEntry;
                    codecID = trackEntry.codecID;
                    // channels = trackEntry.channels;
                    // rate = trackEntry.rate;
                    break;
                }
            }
        }

        this.audioTrack = tempTrack;
        switch (codecID) {
            case 'A_VORBIS':
                this.audioCodec = 'vorbis';
                this.initVorbisHeaders(tempTrack);
                break;
            case 'A_OPUS':
                this.audioCodec = 'opus';
                this.initOpusHeaders(tempTrack);
                break;
            case 'A_AAC':
                this.audioCodec = 'aac';
                this.initAacHeaders(tempTrack);
                break;
            default:
                this.audioCodec = null;
                break;
        }

        if (this.tracks) {
            for (const i in this.tracks.trackEntries) {
                const trackEntry = this.tracks.trackEntries[i];
                if (trackEntry.trackType === 1) {
                    // video track
                    tempTrack = trackEntry;
                    codecID = trackEntry.codecID;
                    break;
                }
            }
        }

        switch (codecID) {
            case 'V_VP8':
                this.videoCodec = 'vp8';
                break;
            case 'V_VP9':
                this.videoCodec = 'vp9';
                break;
            default:
                this.videoCodec = null;
                break;
        }

        this.videoTrack = tempTrack;
        const fps = 0; // For now

        if (tempTrack) {
            this.videoFormat = {
                width: tempTrack.width,
                height: tempTrack.height,
                chromaWidth: tempTrack.width >> 1,
                chromaHeight: tempTrack.height >> 1,
                cropLeft: tempTrack.pixelCropLeft,
                cropTop: tempTrack.pixelCropTop,
                cropWidth: tempTrack.width - tempTrack.pixelCropLeft - tempTrack.pixelCropRight,
                cropHeight: tempTrack.height - tempTrack.pixelCropTop - tempTrack.pixelCropBottom,
                displayWidth: tempTrack.displayWidth,
                displayHeight: tempTrack.displayHeight,
                fps: fps
            };
        }
        this.loadedMetadata = true;
    }

    public initOpusHeaders(trackEntry: any): void {
        this.audioTrack = trackEntry;
    }

    public initVorbisHeaders(trackEntry: any): void {
        const headerParser = new DataView(trackEntry.codecPrivate);
        const packetCount = headerParser.getUint8(0);
        const firstLength = headerParser.getUint8(1);
        const secondLength = headerParser.getUint8(2);
        const thirdLength = headerParser.byteLength - firstLength - secondLength - 1;
        if (packetCount !== 2) throw 'INVALID VORBIS HEADER';
        let start = 3;
        let end = start + firstLength;

        this.audioPackets.push({
            data: headerParser.buffer.slice(start, end),
            timestamp: -1
        });
        start = end;
        end = start + secondLength;

        this.audioPackets.push({
            data: headerParser.buffer.slice(start, end),
            timestamp: -1
        });
        start = end;
        end = start + thirdLength;
        this.audioPackets.push({
            data: headerParser.buffer.slice(start, end),
            timestamp: -1
        });
        this.audioTrack = trackEntry;
    }

    public initAacHeaders(trackEntry: any): void {
        this.audioTrack = trackEntry;
    }

    /**
     * This function ques up more data to the internal buffer
     * @param {arraybuffer} data
     * @returns {void}
     */
    public queueData(data: ArrayBuffer): void {
        this.dataInterface.recieveInput(data);
    }

    public demux(): void {
        switch (this.state) {
            case State.INITIAL:
                this.initDemuxer();
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (this.state !== State.DECODING) break;
            // eslint-disable-next-line no-fallthrough
            case State.DECODING:
                this.load();
                //if (this.state !== STATE_FINISHED)
                break;
            case State.SEEKING:
                this.processSeeking();
                //if (this.state !== META_LOADED)
                break;
            default:
                console.warn('INVALID STATE');
            //fill this out
        }
    }

    /**
     * General process loop,
     * TODO, refactor this!!!!!
     */
    public load(): boolean {
        let status = false;

        if (!this.segment) {
            return false;
        }

        while (this.dataInterface.offset < this.segment.end) {
            if (!this.tempElementHeader.status) {
                this.dataInterface.peekAndSetElement(this.tempElementHeader);
                if (!this.tempElementHeader.status) return false;
            }
            switch (this.tempElementHeader.id) {
                case 0x114d9b74: //Seek Head
                    if (!this.seekHead)
                        this.seekHead = new SeekHead(this.tempElementHeader.getData(), this.dataInterface);
                    this.seekHead.load();
                    if (!this.seekHead.loaded) return false;
                    break;
                case 0xec: {
                    //VOid
                    const skipped = this.dataInterface.skipBytes(this.tempElementHeader.size);
                    if (skipped === false) return false;
                    break;
                }
                case 0x1549a966: //Info
                    if (!this.segmentInfo)
                        this.segmentInfo = new SegmentInfo(this.tempElementHeader.getData(), this.dataInterface);
                    this.segmentInfo.load();
                    if (!this.segmentInfo.loaded) return false;
                    break;

                case 0x1654ae6b: //Tracks
                    if (!this.tracks)
                        this.tracks = new Tracks(this.tempElementHeader.getData(), this.dataInterface, this);
                    this.tracks.load();
                    if (!this.tracks.loaded) return false;
                    break;

                case 0x1c53bb6b: //Cues
                    if (!this.cues) this.cues = new Cues(this.tempElementHeader.getData(), this.dataInterface, this);
                    this.cues.load();
                    if (!this.cues.loaded) return false;
                    this.cuesLoaded = true;
                    break;

                case 0x1254c367: //Tags
                    if (!this.tags) this.tags = new Tags(this.tempElementHeader.getData(), this.dataInterface, this);
                    this.tags.load();
                    if (!this.tags.loaded) return false;
                    break;

                case 0x1f43b675: //Cluster
                    if (!this.loadedMetadata) {
                        this.validateMetadata();
                        return true;
                    }
                    if (!this.currentCluster) {
                        this.currentCluster = new Cluster(
                            this.tempElementHeader.offset,
                            this.tempElementHeader.size,
                            this.tempElementHeader.end,
                            this.tempElementHeader.dataOffset,
                            this.dataInterface,
                            this
                        );
                    }
                    status = this.currentCluster.load();
                    if (!this.currentCluster.loaded) {
                        return status;
                    }
                    this.currentCluster = null;
                    break;
                default: {
                    this.state = State.META_LOADED;
                    const skipped = this.dataInterface.skipBytes(this.tempElementHeader.size);
                    if (skipped === false) return false;
                    console.log(`UNSUPORTED ELEMENT FOUND, SKIPPING : ${this.tempElementHeader.id.toString(16)}`);
                    break;
                }
            }
            this.tempElementHeader.reset();
        }

        this.eof = true;
        this.state = State.FINISHED;
        return status;
    }

    public initDemuxer(): boolean {
        //Header is small so we can read the whole thing in one pass or just wait for more data if necessary
        const dataInterface = this.dataInterface; //cache dataInterface reference
        if (!this.headerIsLoaded) {
            //only load it if we didnt already load it
            if (!this.elementEBML) {
                this.elementEBML = dataInterface.peekElement();
                if (!this.elementEBML) return false;

                if (this.elementEBML.id !== 0x1a45dfa3) {
                    //EBML
                    //If the header has not loaded and the first element is not the header, do not continue
                    console.warn('INVALID PARSE, HEADER NOT LOCATED');
                }
            }

            const end = this.elementEBML.end;
            while (dataInterface.offset < end) {
                if (!this.tempElementHeader.status) {
                    dataInterface.peekAndSetElement(this.tempElementHeader);
                    if (!this.tempElementHeader.status) return false;
                }
                switch (this.tempElementHeader.id) {
                    case 0x4286: {
                        //EBMLVersion
                        const version = dataInterface.readUnsignedInt(this.tempElementHeader.size);
                        if (version !== null) this.version = version;
                        else return false;
                        break;
                    }
                    case 0x42f7: {
                        //EBMLReadVersion
                        const readVersion = dataInterface.readUnsignedInt(this.tempElementHeader.size);
                        if (readVersion !== null) this.readVersion = readVersion;
                        else return false;
                        break;
                    }
                    case 0x42f2: {
                        //EBMLMaxIDLength
                        const maxIdLength = dataInterface.readUnsignedInt(this.tempElementHeader.size);
                        if (maxIdLength !== null) this.maxIdLength = maxIdLength;
                        else return false;
                        break;
                    }
                    case 0x42f3: {
                        //EBMLMaxSizeLength
                        const maxSizeLength = dataInterface.readUnsignedInt(this.tempElementHeader.size);
                        if (maxSizeLength !== null) this.maxSizeLength = maxSizeLength;
                        else return false;
                        break;
                    }
                    case 0x4282: {
                        //DocType
                        const docType = dataInterface.readString(this.tempElementHeader.size);
                        if (docType !== null) this.docType = docType;
                        else return false;
                        break;
                    }
                    case 0x4287: {
                        //DocTypeVersion //worked
                        const docTypeVersion = dataInterface.readUnsignedInt(this.tempElementHeader.size);
                        if (docTypeVersion !== null) this.docTypeVersion = docTypeVersion;
                        else return false;
                        break;
                    }
                    case 0x4285: {
                        //DocTypeReadVersion //worked
                        const docTypeReadVersion = dataInterface.readUnsignedInt(this.tempElementHeader.size);
                        if (docTypeReadVersion !== null) this.docTypeReadVersion = docTypeReadVersion;
                        else return false;
                        break;
                    }
                    case 0xbf: {
                        //CRC-32
                        const crc = dataInterface.getBinary(this.tempElementHeader.size);
                        if (crc !== null) crc;
                        //this.docTypeReadVersion = docTypeReadVersion;
                        else return false;
                        break;
                    }
                    default:
                        console.warn(
                            `UNSUPORTED HEADER ELEMENT FOUND, SKIPPING : ${this.tempElementHeader.id.toString(16)}`
                        );
                        break;
                }
                this.tempElementHeader.reset();
            }
            this.headerIsLoaded = true;
        }

        //Now find segment offsets
        if (!this.currentElement) this.currentElement = this.dataInterface.peekElement();

        if (!this.currentElement) return false;

        switch (this.currentElement.id) {
            case 0x18538067: // Segment
                this.segment = this.currentElement;
                break;
            case 0xec: {
                // void
                const skipped = this.dataInterface.skipBytes(this.tempElementHeader.size);
                if (skipped === false) return false;
                break;
            }
            default:
                console.warn(`Global element not found, id: ${this.currentElement.id}`);
        }

        this.currentElement = null;
        this.segmentIsLoaded = true;
        this.state = State.DECODING;
        return true;
    }

    public flush(): void {
        this.audioPackets = [];
        this.videoPackets = [];
        this.dataInterface.flush();
        //this.tempElementHeader.reset();
        this.tempElementHeader = new ElementHeader(-1, -1, -1, -1);
        this.tempElementHeader.reset();
        this.currentElement = null;
        this.currentCluster = null;
        this.eof = false;
    }

    public processSeeking(): number {
        //Have to load cues if not available
        if (!this.cuesLoaded) {
            //throw "cues not loaded";
            if (!this.cuesOffset) {
                this.initCues();
                this.flush();
                this.dataInterface.offset = this.cuesOffset;
                this.onseek ? this.onseek(this.cuesOffset) : 0;
                return 0;
            }
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return 0;
            }
            if (!this.cues) this.cues = new Cues(this.currentElement, this.dataInterface, this);
            //processing cues
            this.cues.load();
            if (!this.cues.loaded) return 0;
            this.cuesLoaded = true;
            //console.warn(this.cues);
            return 0;
        }
        //now we can caluclate the pointer offset
        this.calculateKeypointOffset();
        //we should now have the cue point
        const clusterOffset = this.seekCueTarget?.cueTrackPositions.cueClusterPosition + this.segment?.dataOffset;
        this.flush();
        this.dataInterface.offset = clusterOffset;
        this.onseek ? this.onseek(clusterOffset) : 0;
        this.state = State.DECODING;
        return 0;
    }

    /**
     * Possibly use this to initialize cues if not loaded, can be called from onScrub or seekTo
     * Send seek request to cues, then make it keep reading bytes and waiting until cues are loaded
     * @returns {undefined}
     */
    public initCues(): void {
        if (!this.cuesOffset && this.seekHead) {
            const length = this.seekHead.entries.length;
            const entries = this.seekHead.entries;
            //console.warn(this.seekHead);
            // let seekOffset;
            //Todo : make this less messy
            for (let i = 0; i < length; i += 1) {
                if (entries[i].seekId === 0x1c53bb6b)
                    // cues
                    this.cuesOffset = entries[i].seekPosition + (this.segment?.dataOffset ?? 0); // its the offset from data offset
            }
        }
    }

    /**
     * Get the offset based off the seconds, probably use binary search and have to parse the keypoints to numbers
     */
    public calculateKeypointOffset(): void {
        if (!this.segmentInfo || !this.cues) {
            return;
        }

        const timecodeScale = this.segmentInfo.timecodeScale;
        this.seekTime;
        const cuesPoints = this.cues.entries; //cache for faster lookups;
        const length = this.cues.entries.length; // total number of cues;
        let scanPoint = cuesPoints[0];
        let tempPoint;

        //do linear search now
        //Todo, make binary search
        let i = 1;
        for (i; i < length; i++) {
            tempPoint = cuesPoints[i];
            if (tempPoint.cueTime * timecodeScale > this.seekTime) break;
            scanPoint = tempPoint;
        }
        this.seekCueTarget = scanPoint;
    }
}
