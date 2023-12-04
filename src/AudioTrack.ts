import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader } from './ElementHeader';
import { Track } from './Track';

export class AudioTrack extends Track {
    public readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public loaded = false;
    public rate = 0;
    public channel = null;
    public bitDepth = 0;

    public currentElement: ElementHeader | null = null;
    public channels: number = 0;

    public constructor(trackHeader: any, dataInterface: DataInterface) {
        super();
        this.dataInterface = dataInterface;
        this.offset = trackHeader.offset;
        this.size = trackHeader.size;
        this.end = trackHeader.end;
        this.loaded = false;

        this.channel = null;
    }

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }

            switch (this.currentElement.id) {
                //TODO add duration and title
                case 0xb5: {
                    //Sample Frequency //TODO: MAKE FLOAT
                    const rate = this.dataInterface.readFloat(this.currentElement.size);
                    if (rate !== null) this.rate = rate;
                    else return false;
                    break;
                }
                case 0x9f: {
                    //Channels
                    const channels = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (channels !== null) this.channels = channels;
                    else return false;
                    break;
                }
                case 0x6264: {
                    //bitDepth
                    const bitDepth = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (bitDepth !== null) this.bitDepth = bitDepth;
                    else return false;
                    break;
                }
                default:
                    console.warn('Ifno element not found, skipping');
                    break;
            }
            this.currentElement = null;
        }
        this.loaded = true;
        return true;
    }
}
