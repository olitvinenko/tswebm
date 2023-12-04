import { CueTrackPositions } from './CueTrackPositions';
import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeaderData } from './ElementHeader';
import { JsWebm } from './JsWebm';

export class Cues {
    public readonly dataInterface: DataInterface;
    public readonly demuxer: JsWebm;
    public offset: number;
    public size: number;
    public end: number;
    public entries: CuePoint[] = [];
    public loaded = false;
    private tempEntry: any = null;
    public currentElement: any = null;
    public cuePoints: any;

    public constructor(cuesHeader: ElementHeaderData, dataInterface: DataInterface, demuxer: JsWebm) {
        this.dataInterface = dataInterface;
        this.demuxer = demuxer;
        this.offset = cuesHeader.offset;
        this.size = cuesHeader.size;
        this.end = cuesHeader.end;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0xbb: {
                    //CuePoint
                    if (!this.tempEntry) this.tempEntry = new CuePoint(this.currentElement, this.dataInterface);
                    this.tempEntry.load();
                    if (!this.tempEntry.loaded) return false;
                    else this.entries.push(this.tempEntry);
                    break;
                }
                case 0xbf: {
                    //CRC-32
                    const crc = this.dataInterface.getBinary(this.currentElement.size);
                    if (crc !== null) crc;
                    //this.docTypeReadVersion = docTypeReadVersion;
                    else return false;
                    break;
                }
                //TODO, ADD VOID
                default:
                    console.warn(`Cue Head element not found ${this.currentElement.id.toString(16)}`); // probably bad
                    break;
            }

            this.tempEntry = null;
            this.currentElement = null;
            //this.cueTrackPositions = this.tempEntry;
            //this.tempEntry = null;
        }

        if (this.dataInterface.offset !== this.end) {
            throw new Error('INVALID CUE FORMATTING');
        }
        this.loaded = true;
        return true;
    }

    public getCount(): number {
        return this.cuePoints.length;
    }

    public init(): void {}

    public preloadCuePoint(): void {}

    public find(): void {}

    public getFirst(): void {}

    public getLast(): void {}

    public getNext(): void {}

    public getBlock(): void {}

    public findOrPreloadCluster(): void {}
}

export class CuePoint {
    public readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public loaded: boolean = false;
    public tempElement = null;
    public currentElement: any = null;
    public cueTime: number = 0;
    public cueTrackPositions: any = null;

    public constructor(cuesPointHeader: any, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = cuesPointHeader.offset;
        this.size = cuesPointHeader.size;
        this.end = cuesPointHeader.end;
        this.tempElement = null;
        this.currentElement = null;
        this.cueTrackPositions = null;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0xb7: {
                    // Cue Track Positions
                    if (!this.cueTrackPositions)
                        this.cueTrackPositions = new CueTrackPositions(this.currentElement, this.dataInterface);
                    this.cueTrackPositions.load();
                    if (!this.cueTrackPositions.loaded) return false;
                    break;
                }
                case 0xb3: {
                    // Cue Time
                    const cueTime = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (cueTime !== null) this.cueTime = cueTime;
                    else return false;
                    break;
                }
                default:
                    console.warn('Cue Point not found, skipping');
                    break;
            }
            this.currentElement = null;
        }
        this.loaded = true;
        return true;
    }
}
