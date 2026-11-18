const fs = require('fs');
const path = require('path');

const currentDir = './dist/'; // 获取当前目录
const htmlPath = path.join(currentDir, 'index.html'); // 获取 index.html 的完整路径
const jsPath = path.join(currentDir, 'index.js'); // 获取 index.js 的完整路径
const outputPath = path.join(currentDir, 'bin'); // 输出目录路径

// 异或函数
function xor(buffer, value) {
    const result = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        result[i] = buffer[i] ^ value;
    }
    return result;
}

function processFile(filePath, outputFilePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`Failed to read file: ${filePath}`, err);
            return;
        }

        // 对数据进行异或操作
        const result = xor(data, 0x49);

        // 将新文件保存到输出目录
        fs.mkdir(outputPath, { recursive: true }, (err) => {
            if (err) {
                console.error(`Failed to create output directory: ${outputPath}`, err);
                return;
            }
            fs.writeFile(outputFilePath, result, (err) => {
                if (err) {
                    console.error(`Failed to write output file: ${outputFilePath}`, err);
                    return;
                }
                console.log('File saved:', outputFilePath);
            });
        });
    });
}

// 读取 index.html 文件
processFile(htmlPath, path.join(outputPath, 'i.bin'));

// 读取 index.js 文件
processFile(jsPath, path.join(outputPath, 'j.bin'));
