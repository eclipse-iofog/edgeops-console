import { useData } from '@/app/providers'
import { Cpu, Boxes, ServerCog, Activity, Server } from 'lucide-react'
import AgentDashboard from './component/AgentDashboard'
import ClusterControllersDashboard from './component/ClusterControllersDashboard'
import MicroservicesDashboard from './component/MicroservicesDashboard'
import SystemMicroservicesDashboard from './component/SystemMicroservicesDashboard'
import { StatusType } from "@/lib/constants/Enums/StatusColor"

const Dashboard = () => {
  const { data } = useData()

  // Calculate key metrics
  const agentData = Object.values(data?.reducedAgents?.byName || [])
  const allMicroservices = data?.applications?.flatMap(app => app.microservices || []) || []
  const systemMicroservices = data?.systemApplications?.flatMap(app => app.microservices || []) || []

  const totalAgents = agentData.length
  const runningAgents = agentData.filter(agent => agent.daemonStatus === StatusType.RUNNING).length
  const totalMicroservices = allMicroservices.length
  const runningMicroservices = allMicroservices.filter(msvc => msvc.status?.status?.toUpperCase() === StatusType.RUNNING).length
  const totalSystemMicroservices = systemMicroservices.length
  const runningSystemMicroservices = systemMicroservices.filter(msvc => msvc.status?.status?.toUpperCase() === StatusType.RUNNING).length
  const clusterControllers = data?.clusterControllers
  const showClusterControllers = clusterControllers !== null
  const activeClusterControllers = showClusterControllers
    ? clusterControllers.filter(controller => controller.isActive).length
    : 0

  const baseMetrics = [
    {
      title: 'Edge Nodes',
      value: totalAgents,
      running: runningAgents,
      color: 'from-blue-500 to-blue-600',
      icon: <Cpu className='w-6 h-6' strokeWidth={2} />
    },
    {
      title: 'Microservices',
      value: totalMicroservices,
      running: runningMicroservices,
      color: 'from-green-500 to-green-600',
      icon: <Boxes className='w-6 h-6' strokeWidth={2} />
    },
    {
      title: 'System Microservices',
      value: totalSystemMicroservices,
      running: runningSystemMicroservices,
      color: 'from-purple-500 to-purple-600',
      icon: <ServerCog className='w-6 h-6' strokeWidth={2} />
    },
    {
      title: 'Overall Health',
      value: `${Math.round(((runningAgents + runningMicroservices + runningSystemMicroservices) / (totalAgents + totalMicroservices + totalSystemMicroservices)) * 100)}%`,
      running: null,
      color: 'from-emerald-500 to-emerald-600',
      icon: <Activity className='w-6 h-6' strokeWidth={2} />
    }
  ]

  const metrics = showClusterControllers
    ? [{
        title: 'Cluster Controllers',
        value: clusterControllers.length,
        running: activeClusterControllers,
        color: 'from-cyan-500 to-teal-600',
        icon: <Server className='w-6 h-6' strokeWidth={2} />
      }, ...baseMetrics]
    : baseMetrics

  const metricsGridClass = metrics.length === 5
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-5 gap-4 sm:gap-6 xl:gap-8 2xl:gap-10 mb-6 sm:mb-8 xl:mb-10'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8 2xl:gap-10 mb-6 sm:mb-8 xl:mb-10'

  return (
    <div className='min-h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white'>
      {/* Header */}
      <div className='bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10'>
        <div className='w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 py-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl xl:text-4xl 2xl:text-5xl font-bold text-white mb-2'>EdgeOps Console</h1>
              <p className='text-gray-300 text-sm xl:text-base 2xl:text-lg'>Live visibility across edge nodes, microservices, and platform health</p>
            </div>
            <div className='text-right'>
              <div className='text-sm xl:text-base text-gray-400'>Last Updated</div>
              <div className='text-lg xl:text-xl 2xl:text-2xl font-semibold text-white'>{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className='w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20 py-8'>
        {/* Key Metrics Cards */}
        <div className={metricsGridClass}>
          {metrics.map((metric, index) => (
            <div key={index} className={`bg-gradient-to-br ${metric.color} rounded-xl p-4 sm:p-6 xl:p-8 2xl:p-10 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
              <div className='flex items-center justify-between'>
                <div className='min-w-0 flex-1'>
                  <p className='text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wide truncate'>{metric.title}</p>
                  <p className='text-2xl sm:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-white mt-1 sm:mt-2'>{metric.value}</p>
                  {metric.running !== null
                    ? (
                      <p className='text-white/70 text-xs sm:text-sm mt-1'>
                        {metric.running} running
                      </p>
                      )
                    : <p className='mt-5' />}
                </div>
                <div className='text-3xl sm:text-4xl opacity-80 flex-shrink-0 ml-2'>
                  {metric.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Cards */}
        <div className='space-y-8 xl:space-y-12 2xl:space-y-16'>
          {showClusterControllers && (
            <ClusterControllersDashboard
              controllers={clusterControllers}
            />
          )}
          <AgentDashboard
            agentData={agentData}
          />
          <MicroservicesDashboard
            applications={data?.applications}
            title='Microservice'
          />
          <SystemMicroservicesDashboard
            systemApplications={data?.systemApplications}
            title='System Microservice'
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
