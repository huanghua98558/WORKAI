/**
 * 默认流程定义索引文件
 * 导出所有默认流程定义，方便使用
 */

import { standardMessageReceiveFlow } from './standard-message-receive';
import { collaborativeAnalysisFlow } from './collaborative-analysis';
import { riskHandlingFlow } from './risk-handling';
import { smartCustomerServiceFlow } from './smart-customer-service';

export { standardMessageReceiveFlow } from './standard-message-receive';
export { collaborativeAnalysisFlow } from './collaborative-analysis';
export { riskHandlingFlow } from './risk-handling';
export { smartCustomerServiceFlow } from './smart-customer-service';

/**
 * 所有默认流程定义的数组
 */
export const defaultFlows = [
  standardMessageReceiveFlow,
  collaborativeAnalysisFlow,
  riskHandlingFlow,
  smartCustomerServiceFlow,
];

/**
 * 按名称查找流程定义
 */
export function findFlowByName(name: string) {
  return defaultFlows.find(flow => flow.name === name);
}

/**
 * 按触发类型获取流程定义
 */
export function getFlowsByTriggerType(triggerType: string) {
  return defaultFlows.filter(flow => flow.triggerType === triggerType);
}
