import { Seek } from './Seek';
import { Track } from './Track';
import { AudioTrack } from './AudioTrack';
import { VideoTrack } from './VideoTrack';
import { JsWebm } from './JsWebm';
import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader, ElementHeaderData } from './ElementHeader';

export class Tracks {
    private readonly demuxer: JsWebm;
    private readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public trackEntries: Track[] = [];
    public loaded = false;
    public tempEntry: Seek | null = null;
    public currentElement: ElementHeader | null = null;
    public trackLoader: TrackLoader | null = null;

    public constructor(seekHeadHeader: ElementHeaderData, dataInterface: DataInterface, demuxer: JsWebm) {
        this.demuxer = demuxer;
        this.dataInterface = dataInterface;
        this.offset = seekHeadHeader.offset;
        this.size = seekHeadHeader.size;
        this.end = seekHeadHeader.end;
    }

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0xae: //Track Entry
                    if (!this.trackLoader) this.trackLoader = new TrackLoader(this.currentElement, this.dataInterface);
                    this.trackLoader.load();
                    if (!this.trackLoader.loaded) return false;
                    else {
                        const trackEntry = this.trackLoader.getTrackEntry();
                        this.trackLoader = null;
                        this.trackEntries.push(trackEntry);
                    }

                    break;
                case 0xbf: {
                    //CRC-32
                    const crc = this.dataInterface.getBinary(this.currentElement.size);
                    if (crc !== null) crc;
                    //this.docTypeReadVersion = docTypeReadVersion;
                    else return false;
                    break;
                }
                default:
                    console.warn(`track element not found, skipping : ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }
        this.loaded = true;
        return true;
    }

    public loadTrackEntry(): void {
        if (!this.tempEntry && this.currentElement) {
            this.tempEntry = new Seek(this.currentElement, this.dataInterface);
        }
    }
}

/**
 * @classdesc The TrackLoader class is a helper class to load the Track subelement types. Since the layout
 * of the Track entries is a little odd, it needs to parse the current
 * level data plus the track container which can be either audio video, content encodings, and maybe subtitles.
 */
class TrackLoader {
    public readonly dataInterface: DataInterface;
    public offset;
    public size;
    public end;
    public loaded: any = false;
    public loading: any = true;
    public trackData: any;
    public tempTrack: any = null;
    public minCache: any = null;
    public currentElement: any;
    public flagDefault: any;

    public constructor(trackheader: any, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = trackheader.offset;
        this.size = trackheader.size;
        this.end = trackheader.end;
        this.loaded = false;
        this.loading = true;
        this.trackData = {};
        this.trackData.trackNumber = null;
        this.trackData.trackType = null;
        this.trackData.name = null;
        this.trackData.codecName = null;
        this.trackData.defaultDuration = null;
        this.trackData.codecID = null;
        this.trackData.lacing = null;
        this.trackData.codecPrivate = null;
        this.trackData.codecDelay = null;
        this.trackData.seekPreRoll = null;
        this.trackData.trackUID = null;
        this.tempTrack = null;
        this.minCache = null;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                // TODO support content encodings
                case 0xe0: // Video Track
                    if (!this.tempTrack) this.tempTrack = new VideoTrack(this.currentElement, this.dataInterface);
                    this.tempTrack.load();
                    if (!this.tempTrack.loaded) return false;
                    break;
                case 0xe1: // Audio Number
                    if (!this.tempTrack) this.tempTrack = new AudioTrack(this.currentElement, this.dataInterface);
                    this.tempTrack.load();
                    if (!this.tempTrack.loaded) return false;
                    break;
                case 0xd7: {
                    // Track Number
                    const trackNumber = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (trackNumber !== null) {
                        this.trackData.trackNumber = trackNumber;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x83: {
                    // TrackType
                    const trackType = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (trackType !== null) {
                        this.trackData.trackType = trackType;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x536e: {
                    // Name
                    const name = this.dataInterface.readString(this.currentElement.size);
                    if (name !== null) {
                        this.trackData.name = name;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x258688: {
                    // CodecName
                    const codecName = this.dataInterface.readString(this.currentElement.size);
                    if (codecName !== null) {
                        this.trackData.codecName = codecName;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x22b59c: {
                    // Language
                    const language = this.dataInterface.readString(this.currentElement.size);
                    if (language !== null) this.trackData.language = language;
                    else return false;
                    break;
                }
                case 0x23e383: {
                    // DefaultDuration
                    const defaultDuration = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (defaultDuration !== null) this.trackData.defaultDuration = defaultDuration;
                    else return false;
                    break;
                }
                case 0x86: {
                    // CodecId
                    const codecID = this.dataInterface.readString(this.currentElement.size);
                    if (codecID !== null) this.trackData.codecID = codecID;
                    else return false;
                    break;
                }
                case 0x9c: {
                    // FlagLacing
                    const lacing = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (lacing !== null) this.trackData.lacing = lacing;
                    else return false;
                    break;
                }
                case 0xb9: {
                    // FlagEnabled
                    const flagEnabled = this.dataInterface.getBinary(this.currentElement.size);
                    if (flagEnabled !== null) {
                        this.trackData.flagEnabled = flagEnabled;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x55aa: {
                    // FlagForced
                    const flagForced = this.dataInterface.getBinary(this.currentElement.size);
                    if (flagForced !== null) {
                        this.trackData.flagForced = flagForced;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x63a2: {
                    // Codec Private
                    const codecPrivate = this.dataInterface.getBinary(this.currentElement.size);
                    if (codecPrivate !== null) {
                        this.trackData.codecPrivate = codecPrivate;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x56aa: {
                    // Codec Delay
                    const codecDelay = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (codecDelay !== null) this.trackData.codecDelay = codecDelay;
                    else return false;
                    break;
                }
                case 0x56bb: {
                    //Pre Seek Roll
                    const seekPreRoll = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (seekPreRoll !== null) this.trackData.seekPreRoll = seekPreRoll;
                    else return false;
                    break;
                }
                case 0x73c5: {
                    // Track UID
                    const trackUID = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (trackUID !== null) this.trackData.trackUID = trackUID;
                    else return false;
                    break;
                }
                case 0x6de7: {
                    // MinCache
                    const minCache = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (minCache !== null) this.trackData.minCache = minCache;
                    else return false;
                    break;
                }
                case 0xbf: {
                    // CRC-32
                    const crc = this.dataInterface.getBinary(this.currentElement.size);
                    if (crc !== null) crc;
                    //this.docTypeReadVersion = docTypeReadVersion;
                    else return false;
                    break;
                }
                case 0x88: {
                    // CRC-32
                    const flagDefault = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (flagDefault !== null) this.flagDefault = flagDefault;
                    //this.docTypeReadVersion = docTypeReadVersion;
                    else return false;
                    break;
                }
                default:
                    if (!this.dataInterface.peekBytes(this.currentElement.size)) return false;
                    else this.dataInterface.skipBytes(this.currentElement.size);
                    console.warn(`track data element not found, skipping : ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }
        this.loaded = true;
        return true;
    }

    public getTrackEntry(): Track {
        this.tempTrack = this.tempTrack || new Track();
        this.tempTrack.loadMeta(this.trackData);
        const tempTrack = this.tempTrack;
        this.tempTrack = null;
        this.loading = false;
        return tempTrack;
    }
}
