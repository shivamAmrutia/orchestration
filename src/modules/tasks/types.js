/**
 * @typedef {Object} TaskContext
 * @property {Object} config
 * @property {Object} input
 * @property {string} executionId
 * @property {string} taskExecutionId
 * @property {Object} workflowInput
 * @property {Object} upstreamOutputs
 * @property {Object} services
 */

/**
 * @typedef {Object} TaskDefinition
 * @property {string} type
 * @property {string} description
 * @property {string} category
 * @property {Object} inputSchema
 * @property {boolean} sideEffects
 * @property {(context: TaskContext) => Promise<any>} run
 */
