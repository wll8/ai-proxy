import fs from 'fs';
import path from 'path';
import { tablemark } from 'tablemark';
import MarkdownIt from 'markdown-it';

// 创建 Markdown 实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

// 读取 list.json
function readListJson() {
  try {
    const data = fs.readFileSync('./list.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取 list.json 失败:', error);
    process.exit(1);
  }
}

// 生成 Markdown 表格
function generateMarkdownTable(stations, isFree = null) {
  // 如果指定了类型,进行过滤
  let filteredStations = stations;
  if (isFree !== null) {
    filteredStations = stations.filter(station => station.is_free === isFree);
  }

  // 按 order 排序(order 越小越靠前),然后按创建时间排序(最新的在前)
  const sortedStations = filteredStations.sort((a, b) => {
    // 首先按 order 排序
    const orderA = a.order ?? 999999; // 如果没有 order,则放到最后
    const orderB = b.order ?? 999999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // order 相同时,按创建时间排序(最新的在前)
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // 准备表格数据
  const tableData = sortedStations.map(station => {
    // 处理链接,移除 query 参数
    const cleanUrl = station.url.split('?')[0];

    return {
      '站点名称': station.name,
      '链接': `[${cleanUrl}](${station.url})`,
      '类型': station.is_free ? '免费' : '收费',
      '备注': station.description || '-',
      '最后可用时间': station.last_available_time || '-'
    };
  });

  const options = {
    columns: ['站点名称', '链接', '类型', '备注', '最后可用时间']
  };

  return tablemark(tableData, options);
}

// 替换 README.MD 中的表格内容
function replaceReadmeContent(freeTable, tollTable) {
  try {
    let readmeContent = fs.readFileSync('./README.MD', 'utf8');

    // 替换免费中转站表格
    const freeStartIndex = readmeContent.indexOf('<!-- LISTFREESTART -->');
    const freeEndIndex = readmeContent.indexOf('<!-- LISTFREEEND -->');

    if (freeStartIndex === -1 || freeEndIndex === -1) {
      console.error('README.MD 中未找到 LISTFREESTART 或 LISTFREEEND 标记');
      process.exit(1);
    }

    const beforeFree = readmeContent.substring(0, freeStartIndex + '<!-- LISTFREESTART -->'.length);
    const afterFree = readmeContent.substring(freeEndIndex);

    readmeContent = beforeFree + '\n\n' + freeTable + '\n\n' + afterFree;

    // 替换收费中转站表格
    const tollStartIndex = readmeContent.indexOf('<!-- LISTTOLLSTART -->');
    const tollEndIndex = readmeContent.indexOf('<!-- LISTTOLLEND -->');

    if (tollStartIndex === -1 || tollEndIndex === -1) {
      console.error('README.MD 中未找到 LISTTOLLSTART 或 LISTTOLLEND 标记');
      process.exit(1);
    }

    const beforeToll = readmeContent.substring(0, tollStartIndex + '<!-- LISTTOLLSTART -->'.length);
    const afterToll = readmeContent.substring(tollEndIndex);

    readmeContent = beforeToll + '\n\n' + tollTable + '\n\n' + afterToll;

    fs.writeFileSync('./README.MD', readmeContent, 'utf8');
    console.log('✅ README.MD 更新成功');
  } catch (error) {
    console.error('更新 README.MD 失败:', error);
    process.exit(1);
  }
}

// 生成 index.html
function generateIndexHtml(stations) {
  try {
    // 先更新 README.MD 中的表格内容
    const freeTable = generateMarkdownTable(stations, true);
    const tollTable = generateMarkdownTable(stations, false);
    replaceReadmeContent(freeTable, tollTable);

    // 读取完整的 README.MD 并渲染为 HTML
    const readmeContent = fs.readFileSync('./README.MD', 'utf8');
    const htmlContent = md.render(readmeContent);

    // 读取 index.html 模板
    let templateContent = fs.readFileSync('./index.html', 'utf8');

    // 查找 README 标记
    const startIndex = templateContent.indexOf('<!-- READMESTART -->');
    const endIndex = templateContent.indexOf('<!-- READMEEND -->');

    if (startIndex === -1 || endIndex === -1) {
      console.error('index.html 中未找到 READMESTART 或 READMEEND 标记');
      process.exit(1);
    }

    // 替换 README 部分
    const before = templateContent.substring(0, startIndex + '<!-- READMESTART -->'.length);
    const after = templateContent.substring(endIndex);

    const updatedContent = before + htmlContent + after;

    fs.writeFileSync('./index.html', updatedContent, 'utf8');
    console.log('✅ index.html 生成成功');
  } catch (error) {
    console.error('生成 index.html 失败:', error);
    process.exit(1);
  }
}

// 主函数
function main() {
  console.log('🚀 开始构建...');

  // 读取数据
  const data = readListJson();
  const stations = data.stations || [];
  console.log(`📋 读取到 ${stations.length} 个中转站数据`);

  // 生成 Markdown 表格
  console.log('📝 生成 Markdown 表格...');
  const freeTable = generateMarkdownTable(stations, true);
  const tollTable = generateMarkdownTable(stations, false);

  // 更新 README.MD
  console.log('🔄 更新 README.MD...');
  replaceReadmeContent(freeTable, tollTable);

  // 更新 index.html
  console.log('🌐 更新 index.html...');
  generateIndexHtml(stations);

  console.log('✅ 构建完成！');
}

// 运行主函数
main();
