"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { emailService,contactService, dashboardService } from "@/lib/database"
import type { Contact } from "@/lib/supabase"
import {
  Mail,
  MessageSquare,
  Phone,
  PieChart,
  PhoneCall,
  UserCheck,
  Calendar,
  Target,
  Trophy,
  MapPin,
  Eye,
  MousePointer,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  User,
  Building2,
  DollarSign,
  // Contact,
} from "lucide-react"
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer } from "recharts"
import { ChartTooltip } from "@/components/ui/chart"



const leadStages = [
  { id: 1, name: "Email Sent",value: "iht_email_sent", icon: Mail, status: "" },
  { id: 2, name: "SMS",value:"sms_sent", icon: MessageSquare, status: "" },
  { id: 3, name: "WhatsApp",value:"whatsapp_sent", icon: MessageSquare, status: "" },
  { id: 4, name: "Vapi Call",value:"vapi_call_made", icon: PhoneCall, status: "" },
  { id: 5, name: "Contacted",value:"converted_to_contact", icon: UserCheck, status: "" },
  { id: 6, name: "Qualified",value:"qualified", icon: Calendar, status: "" },
  // { id: 7, name: "Opportunity",value:"opportunity_created", icon: Target, status: "" },
  // { id: 8, name: "Close Deal", value: "Needs Analysis", icon: Trophy, status: "" },
]

const smsStatusData = [
  { name: "sent", color: "#10b981" },
  { name: "delivered", color: "#3b82f6" },
  { name: "undelivered", color: "#c60bf5ff" },
  { name: "failed", color: "#ef4444" },
]

const whatsappStatusData = [
  { name: "sent", color: "#10b981" },
  { name: "delivered", color: "#3b82f6" },
  { name: "undelivered", color: "#c60bf5ff" },
  { name: "failed", color: "#ef4444" },
  { name: "read", color: "#f59e0b" },
]

const emailStatusData = [
  { name: "openCount", color: "#10b981" },
  { name: "clicksCount", color: "#3b82f6" },
  { name: "unsubscribed", color: "#f59e0b" },
  { name: "marked_as_spam", color: "#ef4444" },
]



export function ContactProgressDashboard({ contact }: { contact: Contact }) {

  const [data, setData] = useState<{
  inBoundEmails: number
  outBoundEmails: number
  status: {
    clicksCount: number
    openCount: number
    marked_as_spam: number
    unsubscribed: number
  }
} | null>(null)
  const [calls,setCalls] = useState<{
    createdAt: string
    advisorName: string
    analysis: string
    summary: string
    score : number
  } | null>(null)
  const [leadStatus,setLeadStatus] = useState<{
    current_progress: string
    summary: string
    last_update: string
  } | null>(null)



  // Initialize twilio messages 
  type TwilioDeliveryStatus = { name: string; value: number; color: string };
  type TwilioMessages = {
    whatsapp: {
      outbound: number;
      inbound: number;
      delivery: TwilioDeliveryStatus[];
    };
    sms: {
      outbound: number;
      inbound: number;
      delivery: TwilioDeliveryStatus[];
    };
  };

  const [twilioMessages, setTwilioMessages] = useState<TwilioMessages>({
    whatsapp: {
      outbound: 0,
      inbound: 0,
      delivery: whatsappStatusData.map(status => ({ name: status.name, value: 0, color: status.color })),
    },
    sms: {
      outbound: 0,
      inbound: 0,
      delivery: smsStatusData.map(status => ({ name: status.name, value: 0, color: status.color })),
    }
  });

  const [LeadStages, setLeadStages] = useState(leadStages)

  useEffect(() => {
    async function fetchEmailStatus() {
      if (!contact?.id) return
      const stats = await emailService.getStats(contact.id)
      setData(stats || null)
    }
    fetchEmailStatus()
  }, [contact?.id])

  // get lead status
  useEffect(() => {
    async function fetchLeadStatus() {
      if (!contact?.id) return
      const status = await emailService.getLeadStatus(contact.id)
      setLeadStatus(status || null)
    }
    fetchLeadStatus()
  }, [contact?.id])

  // get call informations 
  useEffect(() => {
    async function fetchCallData() {
      if (!contact?.id) return
      const callData = await emailService.getCallSummary(contact.id)
      setCalls(callData || null)
    }
    fetchCallData()
  }, [contact?.id])

  //set the stage status based on lead status
  useEffect(() => {
    if (!leadStatus) return
    const updatedStages = [...LeadStages]
    const currentStageIndex = updatedStages.findIndex(stage => stage.value === leadStatus.current_progress) + 1
    if (currentStageIndex !== -1) {
      for (let i = 0; i < currentStageIndex; i++) {
        updatedStages[i].status = "completed"
      }
      updatedStages[currentStageIndex].status = "current"
    }
    setLeadStages(updatedStages)
  }, [leadStatus])

  // fetch twilio messages 
  useEffect(() => {
    async function fetchTwilioMessages() {
      const messages = await dashboardService.getMessages(contact.id);
      const whatsappMessages = [...whatsappStatusData].map((status) => ({
        name: status.name,
        value: messages.whatsapp.delivery[status.name] || 0,
        color: status.color,
      }));
      const smsMessages = [...smsStatusData].map((status) => ({
        name: status.name,
        value: messages.sms.delivery[status.name] || 0,
        color: status.color,
      }));
      messages.whatsapp.delivery = whatsappMessages;
      messages.sms.delivery = smsMessages;
      return setTwilioMessages(messages);
    }
    fetchTwilioMessages();
  }, [contact?.id]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Lead Progress Dashboard</CardTitle>
            <p className="text-sm text-gray-500">Track and manage your lead through the sales pipeline</p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Lead ID: {contact?.id}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute top-8 left-8 right-8 h-0.5 bg-gray-200"></div>
          <div className="absolute top-8 left-8 h-0.5 bg-blue-500" style={{ width: "62.5%" }}></div>

          {/* Timeline Items */}
          <div className="flex justify-between items-start relative">
            {leadStages.map((stage) => {
              const Icon = stage.icon
              return (
                <div key={stage.id} className="flex flex-col items-center space-y-2 relative">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-4 relative
                      ${
                        stage.status === "completed"
                          ? "bg-green-100 border-green-500 text-green-700"
                          : stage.status === "current"
                            ? "bg-blue-100 border-blue-500 text-blue-700"
                            : "bg-gray-100 border-gray-300 text-gray-500"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {stage.status === "current" && (
                      <MapPin className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-xs font-medium ${
                        stage.status === "current" ? "text-blue-700" : "text-gray-600"
                      }`}
                    >
                      {stage.name}
                    </p>
                    {stage.status === "completed" && <p className="text-xs text-gray-400">Completed</p>}
                    {stage.status === "current" && <p className="text-xs text-blue-600 font-medium">In Progress</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-full">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email Opens</p>
              <p className="font-semibold text-gray-900">{data?.status.openCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-full">
              <MousePointer className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Link Clicks</p>
              <p className="font-semibold text-gray-900 ">{data?.status.clicksCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-purple-100 rounded-full">
              <ArrowUpRight className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Outbound Emails</p>
              <p className="font-semibold text-gray-900">{data?.outBoundEmails}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-red-100 rounded-full">
              <ArrowDownLeft className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inbound Emails</p>
              <p className="font-semibold text-gray-900">{data?.inBoundEmails}</p>
            </div>
          </div>
        </div>

{/*         <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Email Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={
                          emailStatusData.map(item => ({
                            name: item.name,
                            value: data?.status ? data.status[item.name as keyof typeof data.status] : 0,
                            color: item.color
                          }))
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {emailStatusData.map((item, index) => (
                          <Cell key={`cell-${index}`} fill={item.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-2 border rounded shadow">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-gray-600">{data.value} emails</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {emailStatusData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-gray-600">
                        {item.name} ({data?.status ? data.status[item.name as keyof typeof data.status] : 0})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div> */}

        {/* SMS & WhatsApp Metrics */}
{/*         <div>
          <h2 className="text-xl font-semibold text-light-900 mb-4">SMS & WhatsApp Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outbound SMS</p>
                <p className="font-semibold text-gray-900">{twilioMessages.sms.outbound}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <ArrowDownLeft className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inbound SMS</p>
                <p className="font-semibold text-gray-900 ">{twilioMessages.sms.inbound}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-full">
                <ArrowUpRight className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outbound Whatsapp</p>
                <p className="font-semibold text-gray-900">{twilioMessages.whatsapp.outbound}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-red-100 rounded-full">
                <ArrowDownLeft className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inbound Whatsapp</p>
                <p className="font-semibold text-gray-900">{twilioMessages.whatsapp.inbound}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6"> */}
            {/* SMS Status Pie Chart */}
{/*             <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  SMS Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={twilioMessages.sms.delivery}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {twilioMessages.sms.delivery.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-2 border rounded shadow">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-gray-600">{data.value} messages</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {twilioMessages.sms.delivery.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-gray-600">
                        {item.name} ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card> */}

            {/* WhatsApp Status Pie Chart */}
{/*             <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  WhatsApp Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={twilioMessages.whatsapp.delivery}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {twilioMessages.whatsapp.delivery.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-2 border rounded shadow">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-gray-600">{data.value} messages</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {twilioMessages.whatsapp.delivery.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-gray-600">
                        {item.name} ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div> */}

        {/* Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Situation Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Current Situation Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Lead Status & Next Steps</label>
                <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Last updated:  {leadStatus?.last_update} </span> 
                {/* <Button variant="outline" size="sm">
                  Update Analysis
                </Button> */}
              </div>
                <Textarea
                  placeholder="Enter current situation analysis..."
                  className="min-h-[120px]"
                  value={leadStatus?.summary || "No summary available"}
                  onChange={() => {}}
                />
              </div>
              
            </CardContent>
          </Card>

          {/* Last Call Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Last Call Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">With Advisor:</span>
                  <Badge variant="secondary">{calls?.advisorName || "Unknown Advisor"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Call Quality:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {calls?.score ? `Score: ${calls.score}/10` : "No score available"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Call Date: {calls?.createdAt || "Unknown Date"}</span>
                {/* <Button variant="outline" size="sm">
                  Update Notes
                </Button> */}
              </div>
                {/* <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Next Action:</span>
                  <Badge variant="outline">Demo Scheduled</Badge>
                </div> */}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Call Summary & Key Points</label>
                <Textarea
                  placeholder="Enter call analysis..."
                  className="min-h-[80px]"
                  value={calls?.summary || "No summary available"}
                  onChange={() => {}}
                />
              </div>

              
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
