Feature: 修改和取消预约

  Scenario: 客户修改预约时间
    Given 客户拥有一个有效预约
    When 客户选择一个可用的新时间
    Then 预约时间更新成功

  Scenario: 重复提交修改
    Given 客户已经使用相同幂等键修改预约
    When 客户再次提交相同请求
    Then 系统返回第一次修改结果
