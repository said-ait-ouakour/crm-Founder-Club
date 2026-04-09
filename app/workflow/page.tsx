import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Users, Target, ArrowRight, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function WorkflowPage() {
  const workflowSteps = [
    {
      id: 1,
      title: "Lead Generation",
      description: "New leads are generated from various sources (website, referrals, seminars)",
      icon: UserPlus,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      actions: ["Qualify lead", "Contact via NAC team", "Assess potential"],
      nextStep: "Contact NAC team to qualify the lead",
    },
    {
      id: 2,
      title: "Lead Qualification",
      description: "NAC team contacts and qualifies the lead based on criteria",
      icon: CheckCircle,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      actions: ["Initial contact", "Needs assessment", "Budget qualification"],
      nextStep: "Convert qualified lead to contact",
    },
    {
      id: 3,
      title: "Contact Conversion",
      description: "Qualified leads are converted into contacts in the CRM system",
      icon: Users,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      actions: ["Create contact record", "Transfer lead data", "Assign advisor"],
      nextStep: "Create opportunities",
    },
    {
      id: 4,
      title: "Opportunity Generation",
      description: "Sales opportunities are created for qualified contacts",
      icon: Target,
      color: "bg-indigo-500",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700",
      actions: ["Identify opportunities", "Set probability", "Assign value"],
      nextStep: "Ongoing client management",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CRM Workflow Process</h1>
          <p className="text-gray-600 mt-2">Visual representation of the lead-to-opportunity conversion process</p>
        </div>

        {/* Process Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Process Flow Overview</CardTitle>
            <CardDescription>
              From initial lead generation to opportunity creation and ongoing management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-16 h-16 ${step.bgColor} rounded-full flex items-center justify-center mb-3`}>
                    <step.icon className={`h-8 w-8 ${step.textColor}`} />
                  </div>
                  <h3 className="font-semibold text-center text-sm">{step.title}</h3>
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 mt-2 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Steps */}
        <div className="space-y-6">
          {workflowSteps.map((step, index) => (
            <Card key={step.id} className="overflow-hidden">
              <CardHeader className={`${step.bgColor} border-b`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${step.color} rounded-full flex items-center justify-center`}>
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className={`${step.textColor} text-xl`}>
                      Step {step.id}: {step.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-1">{step.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className={`${step.textColor} border-current`}>
                    Stage {step.id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Key Actions</h4>
                    <ul className="space-y-2">
                      {step.actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Next Step</h4>
                    <p className="text-sm text-gray-600 mb-4">{step.nextStep}</p>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {step.id === 1 && (
                        <Link href="/leads">
                          <Button size="sm" variant="outline">
                            View Leads
                          </Button>
                        </Link>
                      )}
                      {step.id === 3 && (
                        <Link href="/contacts">
                          <Button size="sm" variant="outline">
                            View Contacts
                          </Button>
                        </Link>
                      )}
                      {step.id === 4 && (
                        <Link href="/opportunities">
                          <Button size="sm" variant="outline">
                            View Opportunities
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Process Statistics */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Process Metrics</CardTitle>
            <CardDescription>Key performance indicators for the CRM workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">24</div>
                <div className="text-sm text-gray-600">Active Leads</div>
                <div className="text-xs text-gray-500 mt-1">Awaiting qualification</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">85%</div>
                <div className="text-sm text-gray-600">Conversion Rate</div>
                <div className="text-xs text-gray-500 mt-1">Lead to Contact</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">18 days</div>
                <div className="text-sm text-gray-600">Avg. Cycle Time</div>
                <div className="text-xs text-gray-500 mt-1">Lead to opportunity</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
