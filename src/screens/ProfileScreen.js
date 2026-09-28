import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import colors, { radius, spacing } from "../constants/colors";
import SkeletonCard from "../components/skeleton/SkeletonCard";
import SkeletonBlock from "../components/skeleton/SkeletonBlock";

function initials(name) {
  const parts = String(name || "Fair Fare").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] || "F").toUpperCase();
}
function errorMessage(error) {
  return error?.response?.data?.errors?.join(" ") || error?.response?.data?.message || "We could not save your profile. Please try again.";
}

export default function ProfileScreen() {
  const { user, isLoading, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  useEffect(() => { setName(user?.name || ""); }, [user?.name]);
  const avatar = useMemo(() => initials(name || user?.name), [name, user?.name]);
  const validate = () => {
    const value = name.normalize("NFKC").trim();
    if (!value) return "Enter your name.";
    if (value.length > 120) return "Name must be 120 characters or fewer.";
    if ([...value].some((character) => /[<>\u0000-\u001F\u007F]/u.test(character))) return "Name contains invalid characters.";
    return null;
  };
  const save = async () => {
    if (saving) return;
    const validation = validate();
    if (validation) { setFeedback({ type: "error", text: validation }); return; }
    const nextName = name.normalize("NFKC").trim();
    if (nextName === user?.name) { setFeedback({ type: "success", text: "Your profile is up to date." }); return; }
    setSaving(true); setFeedback(null);
    try { await updateProfile(nextName); setName(nextName); setFeedback({ type: "success", text: "Profile updated." }); }
    catch (error) { setFeedback({ type: "error", text: errorMessage(error) }); }
    finally { setSaving(false); }
  };
  if (isLoading) return <ScrollView style={styles.flex} contentContainerStyle={styles.content}><View style={styles.header}><SkeletonBlock width={88} height={88} borderRadius={radius.full} /><SkeletonBlock width="42%" height={24} style={{ marginTop: spacing.md }} /><SkeletonBlock width="78%" height={14} style={{ marginTop: spacing.sm }} /></View><SkeletonCard><SkeletonBlock width="28%" height={13} /><SkeletonBlock width="100%" height={52} borderRadius={radius.md} style={{ marginTop: spacing.sm }} /></SkeletonCard><SkeletonCard><SkeletonBlock width="22%" height={13} /><SkeletonBlock width="58%" height={17} style={{ marginTop: spacing.md }} /><SkeletonBlock width="44%" height={13} style={{ marginTop: spacing.sm }} /></SkeletonCard></ScrollView>;
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View style={styles.avatar}><Text style={styles.avatarText}>{avatar}</Text></View><Text style={styles.title}>{name.trim() || "Your profile"}</Text><Text style={styles.subtitle}>Update your display name while keeping your verified email secure.</Text></View>
      <Text style={styles.section}>PERSONAL INFORMATION</Text>
      <View style={styles.card}><Text style={styles.label}>Full name</Text><TextInput value={name} onChangeText={(value) => { setName(value); setFeedback(null); }} style={styles.input} placeholder="Your name" placeholderTextColor={colors.muted} autoCapitalize="words" maxLength={120} returnKeyType="done" onSubmitEditing={save} accessibilityLabel="Full name" /></View>
      <Text style={styles.section}>ACCOUNT INFORMATION</Text>
      <View style={styles.card}><Text style={styles.label}>Email</Text><Text style={styles.email}>{user?.email || "Not available"}</Text><View style={styles.verified}><Text style={styles.check}>✓</Text><Text style={styles.verifiedText}>{user?.emailVerifiedAt ? "Verified email" : "Email verification pending"}</Text></View><Text style={styles.helper}>Your verified email is used for account security.</Text></View>
      {feedback ? <Text style={feedback.type === "error" ? styles.error : styles.success}>{feedback.text}</Text> : null}
      <TouchableOpacity style={[styles.save, saving && styles.disabled]} onPress={save} disabled={saving} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Save changes">{saving ? <ActivityIndicator color={colors.white} accessibilityLabel="Saving profile"/> : <Text style={styles.saveText}>Save changes</Text>}</TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ flex:{flex:1,backgroundColor:colors.background}, content:{padding:spacing.lg,paddingBottom:spacing.xl*2}, header:{alignItems:"center",paddingVertical:spacing.md}, avatar:{width:88,height:88,borderRadius:radius.full,backgroundColor:colors.paleGreen,alignItems:"center",justifyContent:"center",marginBottom:spacing.md}, avatarText:{color:colors.forest,fontSize:30,fontWeight:"800"}, title:{color:colors.primary,fontSize:24,fontWeight:"800",textAlign:"center"}, subtitle:{color:colors.muted,fontSize:14,lineHeight:21,textAlign:"center",marginTop:spacing.sm,maxWidth:320}, section:{color:colors.muted,fontWeight:"800",fontSize:11,letterSpacing:1.2,marginTop:spacing.lg,marginBottom:spacing.sm}, card:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.md}, label:{color:colors.muted,fontSize:13,fontWeight:"700",marginBottom:spacing.sm}, input:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,color:colors.primary,fontSize:16,minHeight:52,paddingHorizontal:spacing.md,backgroundColor:colors.background}, email:{color:colors.primary,fontSize:16,fontWeight:"700"}, verified:{flexDirection:"row",alignItems:"center",marginTop:spacing.sm}, check:{color:colors.success,fontWeight:"900",fontSize:16,marginRight:6}, verifiedText:{color:colors.success,fontWeight:"700",fontSize:13}, helper:{color:colors.muted,fontSize:13,lineHeight:19,marginTop:spacing.md}, error:{color:colors.danger,fontSize:13,lineHeight:19,marginTop:spacing.md}, success:{color:colors.success,fontSize:13,fontWeight:"700",marginTop:spacing.md}, save:{minHeight:54,borderRadius:radius.md,backgroundColor:colors.accent,alignItems:"center",justifyContent:"center",marginTop:spacing.lg}, disabled:{opacity:0.6}, saveText:{color:colors.white,fontSize:16,fontWeight:"800"} });
