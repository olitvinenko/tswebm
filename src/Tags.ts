import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeaderData } from './ElementHeader';
import { JsWebm } from './JsWebm';
import { Tag } from './Tag';

export class Tags {
    private readonly dataInterface: DataInterface;
    private readonly demuxer: JsWebm;
    public offset: number;
    public size: number;
    public end: number;
    public entries = [];
    public loaded: boolean = false;
    public tempEntry: any = null;
    public currentElement: any = null;
    public currentTag: Tag | null = null;
    public tags: any[] = [];

    public constructor(tagsHeader: ElementHeaderData, dataInterface: DataInterface, demuxer: JsWebm) {
        this.dataInterface = dataInterface;
        this.demuxer = demuxer;
        this.offset = tagsHeader.offset;
        this.size = tagsHeader.size;
        this.end = tagsHeader.end;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }

            switch (this.currentElement.id) {
                case 0x7373: //Tag
                    if (!this.currentTag)
                        this.currentTag = new Tag(this.currentElement.getData(), this.dataInterface, this.demuxer);
                    this.currentTag.load();
                    if (!this.currentTag.loaded) return false;

                    this.tags.push(this.currentTag);
                    this.currentTag = null;
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
                    if (!this.dataInterface.peekBytes(this.currentElement.size)) return false;
                    else this.dataInterface.skipBytes(this.currentElement.size);
                    console.warn(`tags element not found, skipping ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }
        this.loaded = true;
        return true;
    }
}
