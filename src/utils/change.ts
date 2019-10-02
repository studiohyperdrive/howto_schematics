import { Change, Host } from "../types/change";

/**
 * An operation that does nothing.
 */
export class NoopChange implements Change {
    description = 'No operation.';
    order = Infinity;
    path = null;
    apply() { return Promise.resolve(); }
}

/**
 * Will add text to the source code.
 */
export class InsertChange implements Change {

    order: number;
    description: string;

    constructor(public path: string, public pos: number, public toAdd: string) {
        if (pos < 0) {
            throw new Error('Negative positions are invalid');
        }
        this.description = `Inserted ${toAdd} into position ${pos} of ${path}`;
        this.order = pos;
    }

    /**
     * This method does not insert spaces if there is none in the original string.
     */
    apply(host: Host) {
        return host.read(this.path).then(content => {
            const prefix = content.substring(0, this.pos);
            const suffix = content.substring(this.pos);

            return host.write(this.path, `${prefix}${this.toAdd}${suffix}`);
        });
    }
}

/**
 * Will remove text from the source code.
 */
export class RemoveChange implements Change {

    order: number;
    description: string;
    length: number;

    constructor(public path: string, public pos: number, public toRemove: string) {
        if (pos < 0) {
            throw new Error('Negative positions are invalid');
        }
        this.description = `Removed ${toRemove} into position ${pos} of ${path}`;
        this.order = pos;
    }

    apply(host: Host): Promise<void> {
        return host.read(this.path).then(content => {
            const prefix = content.substring(0, this.pos);
            const suffix = content.substring(this.pos + this.toRemove.length);

            // TODO: throw error if toRemove doesn't match removed string.
            return host.write(this.path, `${prefix}${suffix}`);
        });
    }
}

/**
 * Will replace text from the source code.
 */
export class ReplaceChange implements Change {
    order: number;
    description: string;

    constructor(public path: string, private pos: number, private oldText: string,
        private newText: string) {
        if (pos < 0) {
            throw new Error('Negative positions are invalid');
        }
        this.description = `Replaced ${oldText} into position ${pos} of ${path} with ${newText}`;
        this.order = pos;
    }

    apply(host: Host): Promise<void> {
        return host.read(this.path).then(content => {
            const prefix = content.substring(0, this.pos);
            const suffix = content.substring(this.pos + this.oldText.length);
            const text = content.substring(this.pos, this.pos + this.oldText.length);

            if (text !== this.oldText) {
                return Promise.reject(new Error(`Invalid replace: "${text}" != "${this.oldText}".`));
            }

            // TODO: throw error if oldText doesn't match removed string.
            return host.write(this.path, `${prefix}${this.newText}${suffix}`);
        });
    }
}