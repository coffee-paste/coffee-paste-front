/**
 * "Simulate download" text file
 * This is a WA to trigger browser download of text file. 
 * @param filename The name for the file
 * @param text The file content
 */
export function downloadAsText(filename: string, text: string) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}