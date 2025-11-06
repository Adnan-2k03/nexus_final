import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad2, Phone, Shield } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import type { RegisterUser } from "@shared/schema";
import { getApiUrl } from "@/lib/api";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [phoneStep, setPhoneStep] = useState<"phone" | "code" | "register">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [codeExpiry, setCodeExpiry] = useState<number | null>(null);

  const [phoneRegisterData, setPhoneRegisterData] = useState<RegisterUser>({
    gamertag: "",
    firstName: "",
    lastName: "",
    age: undefined,
  });

  const handleGoogleLogin = () => {
    window.location.href = getApiUrl("/api/auth/google");
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const response = await fetch(getApiUrl("/api/auth/phone/send-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send code");
      }

      const data = await response.json();
      setCodeExpiry(data.expiresIn);
      setPhoneStep("code");

      toast({
        title: "Code sent!",
        description: `Verification code sent to ${fullPhoneNumber}`,
      });
    } catch (error) {
      toast({
        title: "Failed to send code",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const response = await fetch(getApiUrl("/api/auth/phone/verify-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: fullPhoneNumber, code: verificationCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }

      setPhoneStep("register");

      toast({
        title: "Phone verified!",
        description: "Now complete your profile to continue.",
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Please check your code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const payload = {
        ...phoneRegisterData,
        phoneNumber: fullPhoneNumber,
        verificationCode,
        age: phoneRegisterData.age || undefined,
      };

      const response = await fetch(getApiUrl("/api/auth/phone/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      toast({
        title: "Account created!",
        description: "Welcome to Nexus Match!",
      });

      onAuthSuccess();
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Gamepad2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Nexus Match</h1>
          </div>
          <p className="text-muted-foreground">Find your perfect gaming partner</p>
        </div>

        <Tabs defaultValue="phone" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone" data-testid="tab-phone">
              <Phone className="h-4 w-4 mr-1" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="google" data-testid="tab-google">
              <SiGoogle className="h-4 w-4 mr-1" />
              Google
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phone">
            {phoneStep === "phone" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Phone Verification</CardTitle>
                  </div>
                  <CardDescription>
                    Secure your account with phone authentication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-number">
                        Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-24 px-3 py-2 border rounded-md bg-background"
                          data-testid="select-country-code"
                        >
                          <option value="+1">+1 US</option>
                          <option value="+44">+44 UK</option>
                          <option value="+91">+91 IN</option>
                          <option value="+86">+86 CN</option>
                          <option value="+81">+81 JP</option>
                          <option value="+49">+49 DE</option>
                          <option value="+33">+33 FR</option>
                          <option value="+61">+61 AU</option>
                          <option value="+82">+82 KR</option>
                          <option value="+52">+52 MX</option>
                        </select>
                        <Input
                          id="phone-number"
                          name="phoneNumber"
                          data-testid="input-phone-number"
                          type="tel"
                          placeholder="1234567890"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                          required
                          minLength={10}
                          maxLength={15}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        We'll send you a 6-digit verification code
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-send-code"
                    >
                      {isLoading ? "Sending..." : "Send Verification Code"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {phoneStep === "code" && (
              <Card>
                <CardHeader>
                  <CardTitle>Enter Verification Code</CardTitle>
                  <CardDescription>
                    Enter the 6-digit code sent to {countryCode}{phoneNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">
                        Verification Code <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="verification-code"
                        name="verificationCode"
                        data-testid="input-verification-code"
                        type="text"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        required
                        minLength={6}
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Code expires in {codeExpiry ? Math.floor(codeExpiry / 60) : 10} minutes
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-verify-code"
                    >
                      {isLoading ? "Verifying..." : "Verify Code"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setPhoneStep("phone")}
                      data-testid="button-back-to-phone"
                    >
                      Change Phone Number
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {phoneStep === "register" && (
              <Card>
                <CardHeader>
                  <CardTitle>Complete Your Profile</CardTitle>
                  <CardDescription>
                    Just a few more details to get started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePhoneRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-gamertag">
                        Gamertag <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone-gamertag"
                        name="gamertag"
                        data-testid="input-phone-gamertag"
                        placeholder="ProGamer123"
                        value={phoneRegisterData.gamertag}
                        onChange={(e) =>
                          setPhoneRegisterData({ ...phoneRegisterData, gamertag: e.target.value })
                        }
                        required
                        minLength={3}
                        maxLength={20}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone-firstname">First Name</Label>
                        <Input
                          id="phone-firstname"
                          name="firstName"
                          data-testid="input-phone-firstname"
                          placeholder="John"
                          value={phoneRegisterData.firstName}
                          onChange={(e) =>
                            setPhoneRegisterData({ ...phoneRegisterData, firstName: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone-lastname">Last Name</Label>
                        <Input
                          id="phone-lastname"
                          name="lastName"
                          data-testid="input-phone-lastname"
                          placeholder="Doe"
                          value={phoneRegisterData.lastName}
                          onChange={(e) =>
                            setPhoneRegisterData({ ...phoneRegisterData, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-age">Age</Label>
                      <Input
                        id="phone-age"
                        name="age"
                        data-testid="input-phone-age"
                        type="number"
                        placeholder="18"
                        min="13"
                        max="120"
                        value={phoneRegisterData.age || ""}
                        onChange={(e) =>
                          setPhoneRegisterData({
                            ...phoneRegisterData,
                            age: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-phone-register-submit"
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="google">
            <Card>
              <CardHeader>
                <CardTitle>Sign in with Google</CardTitle>
                <CardDescription>
                  Quick and secure authentication with your Google account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full h-12 text-base"
                  data-testid="button-google-login"
                >
                  <SiGoogle className="h-5 w-5 mr-2" />
                  Continue with Google
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  We'll never post anything without your permission
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
