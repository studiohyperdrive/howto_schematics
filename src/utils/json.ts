export const parseJSON = (data: string): any => {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
};