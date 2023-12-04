import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader, ElementHeaderData } from './ElementHeader';

export class SimpleTag {
    public readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public loaded = false;

    public currentElement: ElementHeader | null = null;

    public tagName: string = '';
    public tagString: string = '';
    public tagLanguage: number = 0;
    public tagDefault: number = 0;

    public constructor(simpleTagHeader: ElementHeaderData, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = simpleTagHeader.offset;
        this.size = simpleTagHeader.size;
        this.end = simpleTagHeader.end;
    }

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0x45a3: {
                    //TagName
                    const tagName = this.dataInterface.readString(this.currentElement.size);
                    if (tagName !== null) this.tagName = tagName;
                    else return false;
                    break;
                }
                case 0x4487: {
                    //TagString
                    const tagString = this.dataInterface.readString(this.currentElement.size);
                    if (tagString !== null) this.tagString = tagString;
                    else return false;
                    break;
                }
                case 0x4484: {
                    // Tag Default
                    const tagDefault = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (tagDefault !== null) this.tagDefault = tagDefault;
                    else return false;
                    break;
                }
                case 0x447a: {
                    // Tag Language
                    const tagLanguage = this.dataInterface.readSignedInt(this.currentElement.size);
                    if (tagLanguage !== null) this.tagLanguage = tagLanguage;
                    else return false;
                    break;
                }
                default:
                    if (!this.dataInterface.peekBytes(this.currentElement.size)) return false;
                    else this.dataInterface.skipBytes(this.currentElement.size);
                    console.warn(`simple tag element not found ! : ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }

        if (this.dataInterface.offset !== this.end) console.error('Invalid Targets Formatting');
        this.loaded = true;
        return true;
    }
}
