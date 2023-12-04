import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader, ElementHeaderData } from './ElementHeader';

export class SegmentInfo {
    private readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;

    public muxingApp: string = '';
    public writingApp: string = '';
    public title: string = '';
    public segmentUID: string = '';

    public timecodeScale = 1000000;
    public duration: number = -1;
    public loaded = false;
    public dateUTC: number = 0;
    public currentElement: ElementHeader | null = null;

    public constructor(infoHeader: ElementHeaderData, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = infoHeader.offset;
        this.size = infoHeader.size;
        this.end = infoHeader.end;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }

            switch (this.currentElement.id) {
                //TODO add duration and title
                case 0x2ad7b1: {
                    // TimeCodeScale
                    const timecodeScale = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (timecodeScale !== null) {
                        this.timecodeScale = timecodeScale;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x4d80: {
                    // Muxing App
                    const muxingApp = this.dataInterface.readString(this.currentElement.size);
                    if (muxingApp !== null) this.muxingApp = muxingApp;
                    else return false;
                    break;
                }
                case 0x5741: {
                    // writing App
                    const writingApp = this.dataInterface.readString(this.currentElement.size);
                    if (writingApp !== null) this.writingApp = writingApp;
                    else return false;
                    break;
                }
                case 0x7ba9: {
                    // title
                    const title = this.dataInterface.readString(this.currentElement.size);
                    if (title !== null) this.title = title;
                    else return false;
                    break;
                }
                case 0x73a4: {
                    // segmentUID
                    // TODO, LOAD THIS AS A BINARY ARRAY, SHOULD BE 128 BIT UNIQUE ID
                    const segmentUID = this.dataInterface.readString(this.currentElement.size);
                    if (segmentUID !== null) this.segmentUID = segmentUID;
                    else return false;
                    break;
                }
                case 0x4489: {
                    // duration
                    const duration = this.dataInterface.readFloat(this.currentElement.size);
                    if (duration !== null) this.duration = duration;
                    else return false;
                    break;
                }
                case 0x4461: {
                    // DateUTC
                    const dateUTC = this.dataInterface.readDate(this.currentElement.size);
                    if (dateUTC !== null) this.dateUTC = dateUTC;
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
                default:
                    console.error(`Ifno element not found, skipping : ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }

        if (this.dataInterface.offset !== this.end) {
            throw new Error('Invalid SegmentInfo Formatting');
        }
        this.loaded = true;
        return true;
    }
}
