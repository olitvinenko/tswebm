import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader, ElementHeaderData } from './ElementHeader';
import { Seek } from './Seek';

export class SeekHead {
    private readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public entries: Seek[] = [];
    public entryCount: number = 0;
    public voidElements: any[] = [];
    public voidElementCount: number = 0;
    public loaded = false;
    public tempEntry: Seek | null = null;
    public currentElement: ElementHeader | null = null;

    public constructor(seekHeadHeader: ElementHeaderData, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = seekHeadHeader.offset;
        this.size = seekHeadHeader.size;
        this.end = seekHeadHeader.end;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0x4dbb: {
                    // Seek
                    if (!this.tempEntry) this.tempEntry = new Seek(this.currentElement, this.dataInterface);
                    this.tempEntry.load();
                    if (!this.tempEntry.loaded) return false;
                    else this.entries.push(this.tempEntry);
                    break;
                }
                case 0xbf: {
                    // CRC-32
                    const crc = this.dataInterface.getBinary(this.currentElement.size);
                    if (crc !== null) crc;
                    // this.docTypeReadVersion = docTypeReadVersion;
                    else return false;
                    break;
                }
                // TODO, ADD VOID
                default:
                    console.warn(`Seek head element not found, skipping : ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.tempEntry = null;
            this.currentElement = null;
        }

        if (this.dataInterface.offset !== this.end) {
            console.log(this);
            throw 'INVALID SEEKHEAD FORMATTING';
        }

        this.loaded = true;
        return true;
    }
}
