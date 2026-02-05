/**
 * 风险处理服务模块
 * 导出所有风险处理相关的服务
 */

const { StaffIdentifier, staffIdentifier } = require('./staff-identifier.service');
const { RiskHandlerService, riskHandlerService } = require('./risk-handler.service');
const { NotifyHumanService, notifyHumanService } = require('./notify-human.service');
const { RiskMonitorService, riskMonitorService } = require('./risk-monitor.service');

module.exports = {
  StaffIdentifier,
  staffIdentifier,
  RiskHandlerService,
  riskHandlerService,
  NotifyHumanService,
  notifyHumanService,
  RiskMonitorService,
  riskMonitorService
};
