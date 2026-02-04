// 临时注释掉主页，避免 Turbopack 解析错误
// 原主页文件太大，导致 Turbopack 无法正确解析
// 需要将主页拆分成多个小组件

// import React from 'react';
// export default function AdminDashboard() {
//   return <div>主页</div>;
// }

// 重定向到简化版主页
export { default } from './simple-dashboard';
