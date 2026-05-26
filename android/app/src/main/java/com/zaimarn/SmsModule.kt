package com.zaimarn

import android.Manifest
import android.content.pm.PackageManager
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SmsModule"

    @ReactMethod
    fun hasPermission(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun sendSms(phoneNumber: String, message: String, promise: Promise) {
        try {
            if (ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.SEND_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("NO_PERMISSION", "SMS permission not granted")
                return
            }

            val smsManager = reactApplicationContext.getSystemService(SmsManager::class.java)
            val parts = smsManager.divideMessage(message)

            if (parts.size == 1) {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            } else {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SEND_FAILED", e.message)
        }
    }

    @ReactMethod
    fun sendSmsToMany(phoneNumbers: ReadableArray, message: String, promise: Promise) {
        try {
            if (ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.SEND_SMS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("NO_PERMISSION", "SMS permission not granted")
                return
            }

            val smsManager = reactApplicationContext.getSystemService(SmsManager::class.java)
            val parts = smsManager.divideMessage(message)

            for (i in 0 until phoneNumbers.size()) {
                val phone = phoneNumbers.getString(i)
                if (!phone.isNullOrEmpty()) {
                    if (parts.size == 1) {
                        smsManager.sendTextMessage(phone, null, message, null, null)
                    } else {
                        smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
                    }
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SEND_FAILED", e.message)
        }
    }
}
