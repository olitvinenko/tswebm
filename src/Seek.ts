import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader } from './ElementHeader';

export class Seek {
    public size: number;
    public offset: number;
    public end: number;
    public readonly dataInterface: DataInterface;
    public loaded = false;
    public currentElement: ElementHeader | null = null;
    public seekId: number = -1;
    public seekPosition: number = -1;

    public constructor(seekHeader: ElementHeader, dataInterface: DataInterface) {
        this.size = seekHeader.size;
        this.offset = seekHeader.offset;
        this.end = seekHeader.end;
        this.dataInterface = dataInterface;
    }

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }

            switch (this.currentElement.id) {
                case 0x53ab: {
                    // SeekId
                    const seekId = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (seekId !== null) {
                        this.seekId = seekId;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x53ac: {
                    // SeekPosition
                    const seekPosition = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (seekPosition !== null) {
                        this.seekPosition = seekPosition;
                    } else {
                        return false;
                    }
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
                    console.warn(`Seek element not found, skipping : ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }
        if (this.dataInterface.offset !== this.end) console.error('Invalid Seek Formatting');
        this.loaded = true;
        return true;
    }
}
