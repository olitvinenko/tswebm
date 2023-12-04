import { Targets } from './Targets';
import { SimpleTag } from './SimpleTag';
import { DataInterface } from './DataInterface/DataInterface';
import { JsWebm } from './JsWebm';
import { ElementHeader } from './ElementHeader';

export class Tag {
    public readonly dataInterface: DataInterface;
    public readonly demuxer: JsWebm;

    public offset: number;
    public size: number;
    public end: number;
    public entries: any[] = [];
    public loaded = false;
    private tempEntry: Targets | SimpleTag | null = null;

    public currentElement: ElementHeader | null = null;
    public targets: Targets[] = [];
    public simpleTags: SimpleTag[] = [];

    public constructor(tagHeader: any, dataInterface: DataInterface, demuxer: JsWebm) {
        this.dataInterface = dataInterface;
        this.demuxer = demuxer;
        this.offset = tagHeader.offset;
        this.size = tagHeader.size;
        this.end = tagHeader.end;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0x63c0: //Targets
                    if (!this.tempEntry) this.tempEntry = new Targets(this.currentElement, this.dataInterface);
                    this.tempEntry.load();
                    if (!this.tempEntry.loaded) return false;
                    this.targets.push(this.tempEntry as Targets);
                    this.tempEntry = null;
                    break;
                case 0x67c8: //SimpleTag
                    if (!this.tempEntry) this.tempEntry = new SimpleTag(this.currentElement, this.dataInterface);
                    this.tempEntry.load();
                    if (!this.tempEntry.loaded) return false;

                    this.simpleTags.push(this.tempEntry as SimpleTag);
                    this.tempEntry = null;
                    break;
                default:
                    if (!this.dataInterface.peekBytes(this.currentElement.size)) return false;
                    else this.dataInterface.skipBytes(this.currentElement.size);
                    console.warn(`tag element not found: ${this.currentElement.id.toString(16)}`); // probably bad
                    break;
            }

            this.tempEntry = null;
            this.currentElement = null;
            //this.cueTrackPositions = this.tempEntry;
            //this.tempEntry = null;
        }

        if (this.dataInterface.offset !== this.end) {
            console.log(this);
            throw 'INVALID CUE FORMATTING';
        }

        this.loaded = true;
        return true;
    }
}
