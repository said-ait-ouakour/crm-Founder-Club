"use client"

import { useState, useEffect } from "react"
import { Calendar, X, Loader2, BarChart3, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { format, differenceInDays } from "date-fns"
import advisorsJson from "@/data/advisors.json"
interface Advisor {
  id: number;
  email: string;
  fullName: string;
  created_at: string;
}
import { Checkbox } from "@/components/ui/checkbox"

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface FormData {
  dateRange: DateRange
  advisorName: string
  advisorId: number | null
  email: string
}

export const MeetingAnalysisChat = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [loadingAdvisors, setLoadingAdvisors] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    dateRange: { from: undefined, to: undefined },
    advisorName: "",
    advisorId: null,
    email: "",
  })
  const [loadingState, setLoadingState] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string>("")
  const [showResult, setShowResult] = useState(false)
  const [errors, setErrors] = useState<{
    dateRange?: string
    advisorName?: string
    email?: string
  }>({})
  const [calendarOpen, setCalendarOpen] = useState<'start' | 'end' | false>(false)
  const [advisorDropdownOpen, setAdvisorDropdownOpen] = useState(false)
  const [showCriteriaTab, setShowCriteriaTab] = useState(false)
  const [criteria, setCriteria] = useState("")
  const [criteriaMode, setCriteriaMode] = useState("none") // "none" | "add"
  const { toast } = useToast()

  useEffect(() => {
    const newSessionId = `meeting_${Date.now()}`
    setSessionId(newSessionId)
  }, [])

  const loadAdvisors = async () => {
    setLoadingAdvisors(true)
    try {
      // Simulate async fetch from local JSON
      const advisorData = advisorsJson.map((advisor, idx) => ({
        ...advisor,
        id: idx + 1, // Assign a numeric id for dropdown
        created_at: "",
      }))
      setAdvisors(advisorData)
    } catch (error) {
      console.error("Error loading advisors from JSON:", error)
    } finally {
      setLoadingAdvisors(false)
    }
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      setFormData((prev: FormData) => ({
        ...prev,
        dateRange: { from: undefined, to: undefined },
      }))
      setErrors((prev: typeof errors) => ({ ...prev, dateRange: undefined }))
      return
    }

    // If both dates are selected, check the 30-day limit
    if (range.from && range.to) {
      const daysDifference = differenceInDays(range.to, range.from)

      if (daysDifference > 30) {
        toast({
          title: "Date Range Too Long",
          description: "Please select a period less than 30 days.",
          variant: "destructive",
        })
        // Reset to just the start date
        setFormData((prev: FormData) => ({
          ...prev,
          dateRange: { from: range.from, to: undefined },
        }))
        return
      }

      if (daysDifference < 0) {
        toast({
          title: "Invalid Date Range",
          description: "End date must be after start date.",
          variant: "destructive",
        })
        return
      }
    }

    setFormData((prev: FormData) => ({
      ...prev,
      dateRange: range,
    }))
    setErrors((prev: typeof errors) => ({ ...prev, dateRange: undefined }))

    // Close calendar when both dates are selected
    if (range.from && range.to) {
      setCalendarOpen(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    // Validate date range
    if (!formData.dateRange.from || !formData.dateRange.to) {
      newErrors.dateRange = "Please select both start and end dates"
    } else {
      const daysDifference = differenceInDays(formData.dateRange.to, formData.dateRange.from)
      if (daysDifference > 30) {
        newErrors.dateRange = "Date range cannot exceed 30 days"
      } else if (daysDifference < 0) {
        newErrors.dateRange = "End date must be after start date"
      }
    }

    // Validate advisor name
    if (!formData.advisorName) {
      newErrors.advisorName = "Please select an advisor"
    }

    // Validate email
    if (!formData.email) {
      newErrors.email = "Please enter an email address"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAnalyze = async () => {
    if (!validateForm()) return

    setLoadingState(true)
    setShowResult(false)

    try {
      // Find selected advisor's email
      const selectedAdvisor = advisors.find((advisor: Advisor) => advisor.id === formData.advisorId)
      const advisorEmail = selectedAdvisor?.email || ""
      const advisorName = selectedAdvisor?.fullName || formData.advisorName
      const requestData = {
        advisor_name: advisorName,
        advisor_email: advisorEmail,
        startDate: formData.dateRange.from?.toISOString().split("T")[0],
        endDate: formData.dateRange.to?.toISOString().split("T")[0],
        receipient_email: formData.email,
        criteria: showCriteriaTab ? criteria : ""
      }

      const response = await fetch(
        "https://hook.eu2.make.com/ul7g4q53m3jbuw4bc7q0k88wa6rdd3bk",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      )

      const result = await response.text()
      setAnalysisResult(result || "No analysis data available for the specified period.")
      setShowResult(true)
    } catch (error) {
      console.error("Analyze error:", error)
      setAnalysisResult("Sorry, we encountered an error while analyzing the data. Please try again later.")
      setShowResult(true)
    } finally {
      setLoadingState(false)
    }
  }

  const handleNewAnalysis = () => {
    setFormData({
      dateRange: { from: undefined, to: undefined },
      advisorName: "",
      advisorId: null,
      email: "",
    })
    setAnalysisResult("")
    setShowResult(false)
    setErrors({})
    setSessionId(`meeting_${Date.now()}`)
    setCriteria("")
    setCriteriaMode("none")
    setShowCriteriaTab(false)
  }

  // Advisor dropdown open handler
  const handleAdvisorDropdownOpenChange = async (open: boolean) => {
    setAdvisorDropdownOpen(open)
    if (open && advisors.length === 0 && !loadingAdvisors) {
      await loadAdvisors()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="h-16 w-16 rounded-full shadow-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:shadow-2xl"
        size="icon"
      >
        <BarChart3 className="h-8 w-8 text-white animate-pulse" />
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex items-center justify-center w-full h-full top-0 left-0 bg-gradient-to-br from-purple-100/90 via-purple-50/80 to-indigo-100/90 backdrop-blur-md transition-all duration-500",
      )}
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
    >
      <Card
        className={cn(
          "flex flex-col shadow-2xl border border-purple-200/50 bg-white/95 backdrop-blur-sm text-purple-900 mx-auto rounded-3xl transition-all duration-500 transform scale-100 w-[95vw] max-w-2xl h-[85vh] md:w-[600px] md:h-[700px] p-0 hover:shadow-purple-200/50 hover:shadow-3xl",
        )}
      >
        <CardHeader className="border-b border-purple-100/50 p-6 flex flex-row items-center justify-between bg-gradient-to-r from-purple-50 via-purple-100 to-indigo-50 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500 rounded-full">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-800 to-indigo-800 bg-clip-text text-transparent">
              Meeting Analysis
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {showResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewAnalysis}
                className="h-8 text-xs bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200 hover:from-purple-200 hover:to-indigo-200 hover:border-purple-300 transition-all duration-300 transform hover:scale-105"
              >
                ✨ New Analysis
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full p-0 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200 hover:from-purple-200 hover:to-indigo-200 hover:border-purple-300 transition-all duration-300 transform hover:scale-110"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
          {!showResult ? (
            <div className="space-y-8 animate-in fade-in-50 duration-700">
              {/* Description */}
              <div className="text-center space-y-4 p-6 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-2xl border border-purple-100/50">
                <p className="text-sm text-purple-600 leading-relaxed max-w-md mx-auto">
                  Generate comprehensive analysis reports for advisor meetings within a specified date range. Get
                  insights on meeting patterns, client interactions, and performance metrics.
                </p>
              </div>

              {/* Form */}
              <div className="space-y-6">
                {/* Start Date Picker */}
                <div className="space-y-3 group">
                  <Label htmlFor="startDate" className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Select Start Date
                  </Label>
                  <Popover open={calendarOpen === 'start'} onOpenChange={(open) => setCalendarOpen(open ? 'start' : false)}>
                    <PopoverTrigger asChild>
                      <Button
                        id="startDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 bg-gradient-to-r from-white to-purple-50/30 border-2 border-purple-200/50 hover:border-purple-300 hover:shadow-lg transition-all duration-300",
                          !formData.dateRange.from && "text-muted-foreground",
                          errors.dateRange && "border-red-400 hover:border-red-500",
                        )}
                      >
                        <CalendarIcon className="mr-3 h-5 w-5 text-purple-500" />
                        {formData.dateRange.from ? (
                          <span className="font-medium">{format(formData.dateRange.from, "LLL dd, y")}</span>
                        ) : (
                          <span className="text-purple-400">Pick a start date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 shadow-2xl border-2 border-purple-200/50 bg-white/95 backdrop-blur-sm rounded-2xl"
                      align="start"
                    >
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl border-b border-purple-100">
                        <h4 className="font-semibold text-purple-800 text-center">Select Start Date</h4>
                        <p className="text-xs text-purple-600 text-center mt-1">
                          Choose the start date for your analysis period.
                        </p>
                      </div>
                      <div className="p-4">
                        <CalendarComponent
                          initialFocus
                          mode="single"
                          selected={formData.dateRange.from}
                          onSelect={(date) => handleDateRangeSelect({
                            from: date,
                            to: formData.dateRange.to
                          })}
                          defaultMonth={formData.dateRange.from}
                          classNames={{
                            months: "space-y-4",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center text-purple-800 font-semibold",
                            caption_label: "text-sm font-semibold",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-purple-100 rounded-full transition-all duration-200",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-purple-600 rounded-md w-8 font-medium text-[0.8rem] text-center",
                            row: "flex w-full mt-2",
                            cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                            day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-purple-100 hover:text-purple-800 rounded-full transition-all duration-200 transform hover:scale-110",
                            day_selected: "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 rounded-full shadow-lg font-semibold",
                            day_today: "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 font-bold rounded-full border-2 border-purple-300",
                            day_outside: "text-purple-300 opacity-50",
                            day_disabled: "text-purple-200 opacity-50 cursor-not-allowed",
                            day_hidden: "invisible"
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {/* End Date Picker */}
                <div className="space-y-3 group">
                  <Label htmlFor="endDate" className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Select End Date
                  </Label>
                  <Popover open={calendarOpen === 'end'} onOpenChange={(open) => setCalendarOpen(open ? 'end' : false)}>
                    <PopoverTrigger asChild>
                      <Button
                        id="endDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12 bg-gradient-to-r from-white to-purple-50/30 border-2 border-purple-200/50 hover:border-purple-300 hover:shadow-lg transition-all duration-300",
                          !formData.dateRange.to && "text-muted-foreground",
                          errors.dateRange && "border-red-400 hover:border-red-500",
                        )}
                      >
                        <CalendarIcon className="mr-3 h-5 w-5 text-purple-500" />
                        {formData.dateRange.to ? (
                          <span className="font-medium">{format(formData.dateRange.to, "LLL dd, y")}</span>
                        ) : (
                          <span className="text-purple-400">Pick an end date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 shadow-2xl border-2 border-purple-200/50 bg-white/95 backdrop-blur-sm rounded-2xl"
                      align="start"
                    >
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl border-b border-purple-100">
                        <h4 className="font-semibold text-purple-800 text-center">Select End Date</h4>
                        <p className="text-xs text-purple-600 text-center mt-1">
                          Choose the end date for your analysis period (max 30 days from start).
                        </p>
                      </div>
                      <div className="p-4">
                        <CalendarComponent
                          mode="single"
                          selected={formData.dateRange.to}
                          onSelect={(date) => handleDateRangeSelect({
                            from: formData.dateRange.from,
                            to: date
                          })}
                          defaultMonth={formData.dateRange.to || formData.dateRange.from}
                          disabled={(date) =>
                            !formData.dateRange.from ||
                            date < formData.dateRange.from ||
                            differenceInDays(date, formData.dateRange.from) > 30
                          }
                          classNames={{
                            months: "space-y-4",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center text-purple-800 font-semibold",
                            caption_label: "text-sm font-semibold",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-purple-100 rounded-full transition-all duration-200",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-purple-600 rounded-md w-8 font-medium text-[0.8rem] text-center",
                            row: "flex w-full mt-2",
                            cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                            day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-purple-100 hover:text-purple-800 rounded-full transition-all duration-200 transform hover:scale-110",
                            day_selected: "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 rounded-full shadow-lg font-semibold",
                            day_today: "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 font-bold rounded-full border-2 border-purple-300",
                            day_outside: "text-purple-300 opacity-50",
                            day_disabled: "text-purple-200 opacity-50 cursor-not-allowed",
                            day_hidden: "invisible"
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-purple-600 mt-1">The maximum period between start and end date is 30 days.</p>
                  {errors.dateRange && (
                    <p className="text-sm text-red-500 flex items-center gap-2 animate-in slide-in-from-left-1">
                      <span className="text-red-400">⚠️</span>
                      {errors.dateRange}
                    </p>
                  )}
                </div>

                {/* Advisor Selection */}
                <div className="space-y-3 group">
                  <Label htmlFor="advisor" className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    👤 Advisor Name
                  </Label>
                  <Select
                    value={formData.advisorId?.toString() || ""}
                    onValueChange={(value: string) => {
                      const selectedAdvisor = advisors.find((advisor: Advisor) => advisor.id.toString() === value)
                      setFormData((prev: FormData) => ({
                        ...prev,
                        advisorId: selectedAdvisor?.id || null,
                        advisorName: selectedAdvisor?.fullName || "",
                        // Don't auto-fill email anymore
                      }))
                      setErrors((prev: typeof errors) => ({ ...prev, advisorName: undefined }))
                    }}
                    open={advisorDropdownOpen}
                    onOpenChange={handleAdvisorDropdownOpenChange}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-12 bg-gradient-to-r from-white to-purple-50/30 border-2 border-purple-200/50 hover:border-purple-300 hover:shadow-lg transition-all duration-300",
                        errors.advisorName && "border-red-400 hover:border-red-500",
                      )}
                    >
                      <SelectValue
                        placeholder={loadingAdvisors ? "🔄 Loading advisors..." : "Select an advisor"}
                        className="font-medium"
                      />
                    </SelectTrigger>
                    <SelectContent className="border-purple-200 shadow-xl">
                      {loadingAdvisors ? (
                        <div className="flex items-center justify-center p-4 text-purple-500">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading advisors...
                        </div>
                      ) : advisors.length === 0 ? (
                        <div className="flex items-center justify-center p-4 text-purple-400">No advisors found</div>
                      ) : (
                        advisors.map((advisor: Advisor) => (
                          <SelectItem
                            key={advisor.id}
                            value={advisor.id.toString()}
                            className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full"></div>
                              {advisor.fullName || "Unnamed Advisor"}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.advisorName && (
                    <p className="text-sm text-red-500 flex items-center gap-2 animate-in slide-in-from-left-1">
                      <span className="text-red-400">⚠️</span>
                      {errors.advisorName}
                    </p>
                  )}
                </div>

                {/* Email Input - Now Editable */}
                <div className="space-y-3 group">
                  <Label htmlFor="email" className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                    📧 Email Address where reports should be sent
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev: FormData) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                      setErrors((prev: typeof errors) => ({ ...prev, email: undefined }))
                    }}
                    className={cn(
                      "h-12 bg-gradient-to-r from-white to-purple-50/30 border-2 border-purple-200/50 hover:border-purple-300 focus:border-purple-400 hover:shadow-lg focus:shadow-lg transition-all duration-300 font-medium",
                      errors.email && "border-red-400 hover:border-red-500 focus:border-red-500",
                    )}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-2 animate-in slide-in-from-left-1">
                      <span className="text-red-400">⚠️</span>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Analysis Criteria Option - Small Square Checkbox */}
                <div className="space-y-3 group">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="criteria-checkbox"
                      checked={showCriteriaTab}
                      onCheckedChange={checked => setShowCriteriaTab(!!checked)}
                      className="w-5 h-5 border-2 border-purple-400 bg-white rounded-sm focus:ring-2 focus:ring-purple-300"
                    />
                    <Label htmlFor="criteria-checkbox" className="text-sm font-semibold text-purple-800 cursor-pointer">
                      Add analysis criteria
                    </Label>
                  </div>
                  {showCriteriaTab && (
                    <Tabs defaultValue="criteria" className="mt-2">
                      {/* <TabsList>
                        <TabsTrigger value="criteria">Insert Criteria</TabsTrigger>
                      </TabsList> */}
                      <TabsContent value="criteria">
                        <Input
                          type="text"
                          placeholder="Enter analysis criteria..."
                          value={criteria}
                          onChange={e => setCriteria(e.target.value)}
                          className="mt-2 h-12 bg-gradient-to-r from-white to-purple-50/30 border-2 border-purple-200/50 focus:border-purple-400 font-medium"
                        />
                      </TabsContent>
                    </Tabs>
                  )}
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={handleAnalyze}
                  disabled={loadingState}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-8"
                >
                  {loadingState ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Preparing Analysis...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-3 h-5 w-5" />✨ Analyze Meetings
                    </>
                  )}
                </Button>

                {/* Loading Message */}
                {loadingState && (
                  <div className="text-center p-6 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-xl border border-purple-200/50 animate-in fade-in-50 slide-in-from-bottom-3">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                    <p className="text-purple-700 font-semibold text-lg">Hold on a few minutes... ⏳</p>
                    <p className="text-purple-600 text-sm mt-2">We're preparing your comprehensive analysis</p>
                    <div className="flex justify-center space-x-1 mt-4">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Analysis Result */
            <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
              <div className="text-center space-y-4 p-6 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 rounded-2xl border border-green-200/50">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-green-800 to-emerald-800 bg-clip-text text-transparent">
                  Analysis Complete
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-green-700 font-medium">
                    📊 Analysis for <span className="font-bold">{formData.advisorName}</span>
                  </p>
                  <p className="text-xs text-green-600 bg-green-100/50 px-3 py-1 rounded-full inline-block">
                    📧 {formData.email}
                  </p>
                  <p className="text-xs text-green-600 bg-green-100/50 px-3 py-1 rounded-full inline-block">
                    📅 {formData.dateRange.from && format(formData.dateRange.from, "MMM dd, yyyy")} -{" "}
                    {formData.dateRange.to && format(formData.dateRange.to, "MMM dd, yyyy")}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-8 rounded-2xl border border-purple-200/50 shadow-lg">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-purple-900 leading-relaxed">
                    {(() => {
                      const formatted = analysisResult
                        .replace(/\.(?!\d)/g, ".\n")
                        .replace(/\n+/g, "\n");
                      const [firstLine, ...rest] = formatted.split("\n");
                      return (
                        <>
                          <strong>{firstLine}</strong>
                          {rest.length > 0 && (
                            <>
                              <br />
                              <br />
                              {rest.map((line, idx) =>
                                line.trim() ? (
                                  <p key={idx} style={{ margin: 0 }}>{line.trim()}</p>
                                ) : null
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  )
}

export default MeetingAnalysisChat
