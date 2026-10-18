export function getMaxScrollHeight() {
    const totalHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
    );
    // to account for the actual window height
    return totalHeight - window.innerHeight 
}