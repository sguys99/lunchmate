"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Brain,
  Utensils,
  CreditCard,
  Users,
  Cloud,
  Briefcase,
  Star,
  Clock,
  Navigation,
  Instagram,
  Linkedin,
  FileText,
  CheckCircle,
  X,
} from "lucide-react"

export default function LunchMateLanding() {
  const [showWaitlistForm, setShowWaitlistForm] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "" })
  const [currentDemoCard, setCurrentDemoCard] = useState(0)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.email) {
      // Here you would normally send to Notion API
      console.log("Submitting to waitlist:", formData)
      setShowWaitlistForm(false)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 5000)
      setFormData({ name: "", email: "" })
    }
  }

  const demoCards = [
    {
      name: "용우동",
      menu: "얼큰우동",
      price: "6,500원",
      weather: "☔ 비 오는 날 추천",
      distance: "도보 3분",
      crowdLevel: "보통",
      rating: 4.5,
    },
    {
      name: "김치찌개 전문점",
      menu: "김치찌개",
      price: "8,000원",
      weather: "🌤️ 맑은 날 추천",
      distance: "도보 5분",
      crowdLevel: "한산함",
      rating: 4.7,
    },
    {
      name: "삼겹살 맛집",
      menu: "삼겹살 정식",
      price: "12,000원",
      weather: "🌈 언제나 좋은",
      distance: "도보 7분",
      crowdLevel: "혼잡함",
      rating: 4.3,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100"></div>

        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-bounce blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-30 animate-pulse blur-lg"></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-25 animate-bounce delay-1000 blur-lg"></div>
        <div className="absolute bottom-20 right-10 w-28 h-28 bg-gradient-to-br from-pink-400 to-red-400 rounded-full opacity-20 animate-pulse delay-500 blur-xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-6 leading-tight">
                Lunch
                <br />
                Mate
              </h1>
              <p className="text-2xl font-semibold text-gray-800 mb-4">
                <span className="italic text-purple-600">"수원의 점심 고민,</span>{" "}
                <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent font-bold">
                  AI가 해결해드립니다."
                </span>
              </p>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                수원사업장 인근 맛집을 날씨와 취향에 맞게 추천받아보세요! 🍽️✨
              </p>
              <Button
                onClick={() => setShowWaitlistForm(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-10 py-6 text-lg rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 border-0"
              >
                🚀 지금 미리 체험해보기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="py-20 bg-gradient-to-br from-white via-purple-50 to-pink-50">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              주요 기능
            </span>
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg italic">AI가 만드는 특별한 점심 경험 ✨</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl transform hover:-translate-y-2">
              <CardContent className="pt-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Utensils className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-purple-700 mb-4">매일 달라지는 점심 추천</h3>
                <p className="text-gray-600 leading-relaxed">AI가 계절과 날씨, 선호도를 분석해 드려요. 🤖</p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-3xl transform hover:-translate-y-2">
              <CardContent className="pt-6">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-orange-700 mb-4">지도와 함께 식당 정보 제공</h3>
                <p className="text-gray-600 leading-relaxed">네이버 지도로 위치 확인과 길찾기가 가능해요. 📍</p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl transform hover:-translate-y-2">
              <CardContent className="pt-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-blue-700 mb-4">사용할수록 똑똑해지는 추천</h3>
                <p className="text-gray-600 leading-relaxed">클릭 하나로 당신의 점심을 기억해요. 🧠</p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-green-100 to-teal-100 rounded-3xl transform hover:-translate-y-2">
              <CardContent className="pt-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CreditCard className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-4">100% 무료, 가입 없이 사용 가능</h3>
                <p className="text-gray-600 leading-relaxed">로그인 없이 바로 점심 고민 끝! 💸</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Usage Scenarios Section */}
      <section className="py-20 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              이럴 때 쓰세요!
            </span>
          </h2>
          <p className="text-center text-gray-600 mb-16 text-lg italic">실제 상황별 사용 예시 💡</p>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Card className="p-8 border-0 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="pt-0">
                  <div className="flex items-start space-x-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">
                        "오늘 회의가 많아서 점심 빨리 결정하고 싶어요." 💼
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        바쁜 일정 중에도 AI가 빠르게 최적의 선택을 제안해드려요.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-8 border-0 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="pt-0">
                  <div className="flex items-start space-x-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Cloud className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">"비 오는 날엔 따뜻한 국물이 땡겨요." ☔</h3>
                      <p className="text-gray-600 leading-relaxed">
                        날씨에 따른 맞춤 메뉴를 추천해서 기분까지 좋아져요.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="p-8 border-0 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="pt-0">
                  <div className="flex items-start space-x-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">
                        "새로운 팀원이 왔는데 어디가 좋을지 모르겠어요." 👥
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        다양한 취향을 고려한 추천으로 모두가 만족할 수 있어요.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 shadow-2xl border border-white/50">
              <h3 className="text-3xl font-bold text-center mb-8">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  LunchMate 사용 플로우
                </span>
              </h3>
              <div className="space-y-6">
                <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                    1
                  </div>
                  <span className="text-gray-700 font-medium">현재 날씨와 위치 확인 🌤️</span>
                </div>
                <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                    2
                  </div>
                  <span className="text-gray-700 font-medium">AI가 맞춤 식당 분석 🤖</span>
                </div>
                <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                    3
                  </div>
                  <span className="text-gray-700 font-medium">추천 결과와 지도 제공 📍</span>
                </div>
                <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-green-100 to-teal-100 rounded-2xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                    4
                  </div>
                  <span className="text-gray-700 font-medium">선택하고 맛있게 식사! 🍽️</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
              추천 예시
            </span>
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg italic">
            실제 서비스에서는 이런 식으로 추천해드려요! 🍱
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center space-x-4 mb-8">
              {demoCards.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentDemoCard(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    currentDemoCard === index
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 scale-125"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            <Card className="max-w-md mx-auto shadow-2xl border-0 overflow-hidden rounded-3xl bg-white/90 backdrop-blur-sm">
              <div className="relative">
                <div className="h-48 bg-gradient-to-br from-orange-400 via-pink-400 to-purple-400 flex items-center justify-center">
                  <Utensils className="w-16 h-16 text-white opacity-60" />
                </div>
                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 rounded-full px-4 py-2 shadow-lg">
                  ✨ 오늘의 추천
                </Badge>
              </div>

              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{demoCards[currentDemoCard].name}</h3>
                    <p className="text-purple-600 font-semibold text-lg">{demoCards[currentDemoCard].menu}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                      {demoCards[currentDemoCard].price}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                    <span className="text-xl">{demoCards[currentDemoCard].weather}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl">
                    <Navigation className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700 font-medium">{demoCards[currentDemoCard].distance}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="text-gray-700 font-medium">혼잡도: {demoCards[currentDemoCard].crowdLevel}</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-pink-50 to-red-50 rounded-xl">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="text-gray-700 font-medium">{demoCards[currentDemoCard].rating} ⭐</span>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 rounded-2xl text-lg font-semibold shadow-lg border-0">
                  📍 지도에서 보기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Waitlist Form Dialog */}
      <Dialog open={showWaitlistForm} onOpenChange={setShowWaitlistForm}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                웨이팅 리스트 등록
              </span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-gray-700 font-semibold text-lg">
                이름 *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-2 rounded-2xl border-2 border-purple-200 focus:border-purple-400 p-4 text-lg"
                placeholder="이름을 입력해주세요"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-700 font-semibold text-lg">
                이메일 *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-2 rounded-2xl border-2 border-purple-200 focus:border-purple-400 p-4 text-lg"
                placeholder="이메일을 입력해주세요"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 rounded-2xl text-lg font-semibold shadow-lg border-0"
            >
              🚀 웨이팅 리스트 등록하기
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 max-w-md mx-4 text-center relative animate-in fade-in zoom-in duration-300 shadow-2xl border border-white/50">
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-4">
              <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                🎉 등록 완료!
              </span>
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              웨이팅 리스트 등록이 완료되었습니다.
              <br />
              출시되면 가장 먼저 알려드릴게요! ✨
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              LunchMate
            </h3>
            <p className="text-purple-200 mb-8 text-lg">LunchMate 팀 | sguys99@gmail.com</p>
            <div className="flex justify-center space-x-8">
              <button className="text-purple-300 hover:text-white transition-all duration-300 transform hover:scale-110 p-3 rounded-full bg-white/10 backdrop-blur-sm">
                <Instagram className="w-8 h-8" />
              </button>
              <button className="text-purple-300 hover:text-white transition-all duration-300 transform hover:scale-110 p-3 rounded-full bg-white/10 backdrop-blur-sm">
                <FileText className="w-8 h-8" />
              </button>
              <button className="text-purple-300 hover:text-white transition-all duration-300 transform hover:scale-110 p-3 rounded-full bg-white/10 backdrop-blur-sm">
                <Linkedin className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
